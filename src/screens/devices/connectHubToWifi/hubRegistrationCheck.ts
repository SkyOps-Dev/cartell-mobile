// Port of frontend/lib/screens/devices/connect_hub_to_wifi/hub_registration_check.dart: what one
// "has the hub registered with the server yet?" check found, and what the poll does next. All
// pure, so the decisions are testable without a server.
//
// The three-way answer is the point: "the server says not yet" and "we could not ask" are kept
// apart, because collapsing them is what made pairings that worked look as if they had failed.

import {
  AuthExpiredException,
  OnHUBNetworkException,
  SocketException,
  TimeOutException,
} from '../../../services/exceptions';

/** One check's answer. */
export abstract class HubRegistrationCheck {}

/** A healthy response reported the hub connected. Definite yes. */
export class HubRegistered extends HubRegistrationCheck {}

/** A healthy response reported the hub not connected: "not yet", never "never". */
export class HubNotYetRegistered extends HubRegistrationCheck {}

/** The check could not tell, and why. */
export class HubCheckUnavailable extends HubRegistrationCheck {
  constructor(readonly reason: HubCheckUnavailableReason) {
    super();
  }
}

export enum HubCheckUnavailableReason {
  /** The phone is still on the hub's own network, so it cannot reach the server. */
  stillOnHubNetwork = 'stillOnHubNetwork',
  /** The session is no longer valid (the refresh was rejected). */
  authFailed = 'authFailed',
  /** Nothing came back: a timeout, no route, a reset connection. */
  network = 'network',
  /** The server answered, but not with a 2xx. */
  server = 'server',
  /** The answer could not be read as a hub, or something unforeseen failed. */
  malformed = 'malformed',
}

/** Why a check threw, as a reason. */
export function classifyProbeFailure(
  error: unknown,
): HubCheckUnavailableReason {
  if (error instanceof OnHUBNetworkException) {
    return HubCheckUnavailableReason.stillOnHubNetwork;
  }
  if (error instanceof AuthExpiredException) {
    return HubCheckUnavailableReason.authFailed;
  }
  if (
    error instanceof TimeOutException ||
    error instanceof SocketException ||
    // fetch's "no answer at all", where package:http raises a ClientException that is also a
    // SocketException.
    (error instanceof TypeError && error.message === 'Network request failed')
  ) {
    return HubCheckUnavailableReason.network;
  }
  return HubCheckUnavailableReason.malformed;
}

/** What the waiting screen tells the user while the poll goes on. */
export enum WaitingReason {
  /** The phone has not rejoined its own network yet. */
  rejoiningNetwork = 'rejoiningNetwork',
  /** The server answers; the hub has not appeared yet. */
  waitingForHub = 'waitingForHub',
  /** The server cannot be reached; still retrying. */
  reachingServer = 'reachingServer',
  /** The app is off on the hub's own network, asking whether it is still there. */
  checkingHub = 'checkingHub',
  /** The hub did not answer on its own network; the screen adds the light readings. */
  hubNotAnswering = 'hubNotAnswering',
}

/** What the poller does after a check. */
export abstract class PollDecision {}

/** The hub registered. */
export class SettleSucceeded extends PollDecision {}

/** The session is dead: every later check would fail the same way. */
export class SettleAuthExpired extends PollDecision {}

/** Go back to the hub's own network once and ask whether it is still there. */
export class RunAccessPointProbe extends PollDecision {}

/** Check again after `delayMs`, showing `display`. There is no "settle as failed". */
export class KeepPolling extends PollDecision {
  constructor(readonly delayMs: number, readonly display: WaitingReason) {
    super();
  }
}

/**
 * How long after the hub took the credentials the app goes looking on its own network: 60 s,
 * counted from the hub's acknowledgement. A successful pairing measured 40 s, a rejected one is
 * back on its network after 10 s.
 */
export const kAccessPointProbeAfter = 60_000;

/**
 * The poll's next step after `last`. `consecutiveAuthFailures`, `accessPointProbed` and
 * `sinceCredentialAckMs` are bookkeeping the poller keeps.
 */
export function decidePollStep({
  last,
  completedChecks,
  consecutiveAuthFailures,
  sinceCredentialAckMs = 0,
  accessPointProbed = false,
  isForeground = true,
}: {
  last: HubRegistrationCheck;
  completedChecks: number;
  consecutiveAuthFailures: number;
  sinceCredentialAckMs?: number;
  accessPointProbed?: boolean;
  isForeground?: boolean;
}): PollDecision {
  if (last instanceof HubRegistered) {
    return new SettleSucceeded();
  }

  const isAuthFailed =
    last instanceof HubCheckUnavailable &&
    last.reason === HubCheckUnavailableReason.authFailed;
  if (isAuthFailed && consecutiveAuthFailures >= 3) {
    return new SettleAuthExpired();
  }

  // Once, only on screen, and never while the phone itself is still on the hub's network (from
  // there a probe would blame the hub for a fault on the phone).
  const onHubNetwork =
    last instanceof HubCheckUnavailable &&
    last.reason === HubCheckUnavailableReason.stillOnHubNetwork;
  const probePending = !accessPointProbed && isForeground && !onHubNetwork;

  if (probePending && sinceCredentialAckMs >= kAccessPointProbeAfter) {
    return new RunAccessPointProbe();
  }

  const backoff = backoffAfter(completedChecks);
  return new KeepPolling(
    // Never sleep past the moment the probe comes due.
    probePending
      ? Math.min(backoff, kAccessPointProbeAfter - sinceCredentialAckMs)
      : backoff,
    displayFor(last),
  );
}

/** 2 s after checks 1–3, 5 s after 4–6, 15 s after 7–12, then 60 s. */
function backoffAfter(completedChecks: number): number {
  if (completedChecks <= 3) {
    return 2_000;
  }
  if (completedChecks <= 6) {
    return 5_000;
  }
  if (completedChecks <= 12) {
    return 15_000;
  }
  return 60_000;
}

function displayFor(last: HubRegistrationCheck): WaitingReason {
  if (last instanceof HubCheckUnavailable) {
    return last.reason === HubCheckUnavailableReason.stillOnHubNetwork
      ? WaitingReason.rejoiningNetwork
      : WaitingReason.reachingServer;
  }
  return WaitingReason.waitingForHub;
}

/**
 * Whether the app counts as on screen for the poll. Flutter's lifecycle: null (no report yet),
 * resumed and inactive count; paused, hidden and detached do not. React Native's: unknown (no
 * report yet), active and inactive (iOS, while a system alert is up) count; background and
 * extension do not.
 */
export function isForegroundLifecycle(
  state: string | null | undefined,
): boolean {
  return (
    state === null ||
    state === undefined ||
    state === 'unknown' ||
    state === 'active' ||
    state === 'inactive'
  );
}
