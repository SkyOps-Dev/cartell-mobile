// Port of frontend/lib/screens/devices/connect_hub_to_wifi/hub_registration_poller.dart: checks
// until the hub registers with the server, or until cancelled.
//
// An awaited loop, never a periodic timer, so two checks can never overlap. There is no deadline:
// the only exits are success, an expired session (three auth failures in a row), the hub found
// back on its own network, and cancel. A check that throws is classified and the loop goes on. All
// I/O is injected.

import {
  AccessPointProbeResult,
  HubBackInAccessPointMode,
  HubNotOnAccessPoint,
} from './hubAccessPointProbe';
import {
  classifyProbeFailure,
  decidePollStep,
  HubCheckUnavailable,
  HubCheckUnavailableReason,
  HubNotYetRegistered,
  HubRegistered,
  HubRegistrationCheck,
  KeepPolling,
  RunAccessPointProbe,
  SettleAuthExpired,
  SettleSucceeded,
  WaitingReason,
} from './hubRegistrationCheck';

/** Everything the poller needs to run the access-point probe and report it, as one piece. */
export type AccessPointProbeWiring = {
  /** Time since the hub acknowledged the credentials, which the threshold counts from. */
  sinceCredentialAckMs: () => number;
  probe: () => Promise<AccessPointProbeResult>;
  /** The hub answered on its own network. The only probe outcome that settles anything. */
  onHubReverted: () => void;
};

export type OnWaiting = (
  reason: WaitingReason,
  options?: { showLightReadings?: boolean },
) => void;

/** While the app is in the background no check is made; it looks again after this. */
const backgroundedPollInterval = 5_000;

/** The probe costs seconds of its own, so the poll resumes at the slow end. */
const backoffAfterProbe = 15_000;

export class HubRegistrationPoller {
  private readonly probe: () => Promise<HubRegistrationCheck>;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly isForeground: () => boolean;
  private readonly onWaiting: OnWaiting;
  private readonly onRegistered: () => void;
  private readonly onAuthExpired: () => void;
  private readonly accessPointProbe: AccessPointProbeWiring | null;

  private cancelled = false;
  private accessPointProbed = false;
  /** Sticky once the probe found nothing: the light readings stay; the label still follows. */
  private hubSilentOnAccessPoint = false;
  private checks = 0;
  private consecutiveAuthFailures = 0;
  private reachedServer = false;
  private readonly unavailable = new Map<HubCheckUnavailableReason, number>();

  constructor({
    probe,
    sleep,
    isForeground,
    onWaiting,
    onRegistered,
    onAuthExpired,
    accessPointProbe = null,
  }: {
    probe: () => Promise<HubRegistrationCheck>;
    sleep: (ms: number) => Promise<void>;
    isForeground: () => boolean;
    onWaiting: OnWaiting;
    onRegistered: () => void;
    onAuthExpired: () => void;
    /** Null: a poller that only polls. */
    accessPointProbe?: AccessPointProbeWiring | null;
  }) {
    this.probe = probe;
    this.sleep = sleep;
    this.isForeground = isForeground;
    this.onWaiting = onWaiting;
    this.onRegistered = onRegistered;
    this.onAuthExpired = onAuthExpired;
    this.accessPointProbe = accessPointProbe;
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  get completedChecks(): number {
    return this.checks;
  }

  /** True once any check reached the server, whether or not the hub was connected. */
  get everReachedServer(): boolean {
    return this.reachedServer;
  }

  get unavailableCounts(): ReadonlyMap<HubCheckUnavailableReason, number> {
    return new Map(this.unavailable);
  }

  /** Stops the loop. Safe before, during or after run. */
  cancel(): void {
    this.cancelled = true;
  }

  async run(): Promise<void> {
    while (!this.cancelled) {
      if (!this.isForeground()) {
        await this.sleep(backgroundedPollInterval);
        continue;
      }

      let result: HubRegistrationCheck;
      try {
        result = await this.probe();
      } catch (error) {
        result = new HubCheckUnavailable(classifyProbeFailure(error));
      }

      // A cancel may have landed while the check was in flight: a late success must not count.
      if (this.cancelled) {
        return;
      }

      this.checks++;
      this.record(result);

      if (
        result instanceof HubCheckUnavailable &&
        result.reason === HubCheckUnavailableReason.authFailed
      ) {
        this.consecutiveAuthFailures++;
      } else {
        this.consecutiveAuthFailures = 0;
      }

      const decision = decidePollStep({
        last: result,
        completedChecks: this.checks,
        consecutiveAuthFailures: this.consecutiveAuthFailures,
        sinceCredentialAckMs:
          this.accessPointProbe?.sinceCredentialAckMs() ?? 0,
        accessPointProbed:
          this.accessPointProbed || this.accessPointProbe === null,
        isForeground: this.isForeground(),
      });

      if (decision instanceof SettleSucceeded) {
        this.onRegistered();
        return;
      }
      if (decision instanceof SettleAuthExpired) {
        this.onAuthExpired();
        return;
      }
      if (decision instanceof RunAccessPointProbe && this.accessPointProbe) {
        // Awaited inline, like every step: nothing overlaps.
        this.accessPointProbed = true;
        this.onWaiting(WaitingReason.checkingHub, {
          showLightReadings: this.hubSilentOnAccessPoint,
        });
        const found = await this.accessPointProbe.probe();
        if (this.cancelled) {
          return;
        }
        if (found instanceof HubBackInAccessPointMode) {
          this.accessPointProbe.onHubReverted();
          return;
        }
        if (found instanceof HubNotOnAccessPoint) {
          // Not a settle: silence is also what a hub that paired produces.
          this.hubSilentOnAccessPoint = true;
          this.onWaiting(WaitingReason.hubNotAnswering, {
            showLightReadings: true,
          });
        } else {
          // Inconclusive: says nothing about the hub, and is not retried.
          this.onWaiting(displayAfterFailedProbe(result), {
            showLightReadings: this.hubSilentOnAccessPoint,
          });
        }
        await this.sleep(backoffAfterProbe);
        continue;
      }
      if (decision instanceof KeepPolling) {
        this.onWaiting(decision.display, {
          showLightReadings: this.hubSilentOnAccessPoint,
        });
        await this.sleep(decision.delayMs);
      }
    }
  }

  private record(result: HubRegistrationCheck): void {
    if (
      result instanceof HubRegistered ||
      result instanceof HubNotYetRegistered
    ) {
      this.reachedServer = true;
    } else if (result instanceof HubCheckUnavailable) {
      this.unavailable.set(
        result.reason,
        (this.unavailable.get(result.reason) ?? 0) + 1,
      );
    }
  }
}

/** After an inconclusive probe: whatever the last real check said. */
function displayAfterFailedProbe(last: HubRegistrationCheck): WaitingReason {
  return last instanceof HubCheckUnavailable
    ? WaitingReason.reachingServer
    : WaitingReason.waitingForHub;
}
