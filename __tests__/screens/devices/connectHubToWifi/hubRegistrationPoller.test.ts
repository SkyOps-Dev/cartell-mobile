// Ported from frontend/test/screens/devices/connect_hub_to_wifi/hub_registration_poller_test.dart
// and frontend/test/screens/devices/connect_hub_to_wifi/probe_outcome_test.dart (what the poller
// does with each access-point probe answer).

import {
  AccessPointProbeResult,
  HubBackInAccessPointMode,
  HubNotOnAccessPoint,
  ProbeInconclusive,
} from '../../../../src/screens/devices/connectHubToWifi/hubAccessPointProbe';
import {
  HubCheckUnavailable,
  HubCheckUnavailableReason,
  HubNotYetRegistered,
  HubRegistered,
  HubRegistrationCheck,
  kAccessPointProbeAfter,
  WaitingReason,
} from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationCheck';
import { HubRegistrationPoller } from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationPoller';
import { SocketException } from '../../../../src/services/exceptions';

const yieldOnce = () => new Promise<void>(resolve => setImmediate(resolve));

/** Returns queued results in order, then repeats the last; notes any concurrent entry. */
class ScriptedProbe {
  calls = 0;
  sawOverlap = false;
  private inFlight = false;
  constructor(private readonly results: HubRegistrationCheck[]) {}

  call = async (): Promise<HubRegistrationCheck> => {
    if (this.inFlight) {
      this.sawOverlap = true;
    }
    this.inFlight = true;
    // Yield, so a caller firing checks on a timer would interleave.
    await yieldOnce();
    const result = this.results[Math.min(this.calls, this.results.length - 1)];
    this.calls++;
    this.inFlight = false;
    return result;
  };
}

/** Instant sleep, so an unbounded poll finishes in test time. */
const noSleep = async () => undefined;

const quietPoller = (
  probe: () => Promise<HubRegistrationCheck>,
  overrides: Partial<
    ConstructorParameters<typeof HubRegistrationPoller>[0]
  > = {},
) =>
  new HubRegistrationPoller({
    probe,
    sleep: noSleep,
    isForeground: () => true,
    onWaiting: () => undefined,
    onRegistered: () => undefined,
    onAuthExpired: () => undefined,
    ...overrides,
  });

describe('HubRegistrationPoller', () => {
  test('reports success once the hub registers', async () => {
    const probe = new ScriptedProbe([
      new HubNotYetRegistered(),
      new HubNotYetRegistered(),
      new HubRegistered(),
    ]);
    let registered = false;
    const poller = quietPoller(probe.call, {
      onRegistered: () => {
        registered = true;
      },
    });

    await poller.run();

    expect(registered).toBe(true);
    expect(probe.calls).toBe(3);
    expect(poller.completedChecks).toBe(3);
  });

  test('never runs two probes concurrently', async () => {
    const probe = new ScriptedProbe([
      new HubNotYetRegistered(),
      new HubNotYetRegistered(),
      new HubNotYetRegistered(),
      new HubRegistered(),
    ]);
    await quietPoller(probe.call).run();
    // Overlapping checks are the original root cause.
    expect(probe.sawOverlap).toBe(false);
  });

  test('drops a success that arrives after cancel', async () => {
    let complete: (check: HubRegistrationCheck) => void = () => undefined;
    const gate = new Promise<HubRegistrationCheck>(resolve => {
      complete = resolve;
    });
    let registered = false;
    const poller = quietPoller(() => gate, {
      onRegistered: () => {
        registered = true;
      },
    });

    const run = poller.run();
    await yieldOnce();
    poller.cancel();
    complete(new HubRegistered());
    await run;

    // A late answer must not flip the screen after cancel.
    expect(registered).toBe(false);
  });

  test('keeps polling while stuck on the hub AP and reports the reason', async () => {
    const probe = new ScriptedProbe([
      new HubCheckUnavailable(HubCheckUnavailableReason.stillOnHubNetwork),
      new HubCheckUnavailable(HubCheckUnavailableReason.stillOnHubNetwork),
      new HubRegistered(),
    ]);
    const reasons: WaitingReason[] = [];
    await quietPoller(probe.call, {
      onWaiting: reason => reasons.push(reason),
    }).run();

    expect(reasons).toEqual([
      WaitingReason.rejoiningNetwork,
      WaitingReason.rejoiningNetwork,
    ]);
  });

  test('everReachedServer stays false while stuck on the hub AP', async () => {
    const probe = new ScriptedProbe([
      new HubCheckUnavailable(HubCheckUnavailableReason.stillOnHubNetwork),
    ]);
    const poller = quietPoller(probe.call);

    // Never succeeds, so it is cancelled from outside once a check has run.
    const run = poller.run();
    await yieldOnce();
    await yieldOnce();
    poller.cancel();
    await run;

    expect(poller.everReachedServer).toBe(false);
    expect(
      poller.unavailableCounts.get(HubCheckUnavailableReason.stillOnHubNetwork),
    ).toBeGreaterThan(0);
  });

  test('does not probe while backgrounded, and resumes after', async () => {
    const probe = new ScriptedProbe([new HubRegistered()]);
    let foreground = false;
    let sleeps = 0;
    await quietPoller(probe.call, {
      sleep: async () => {
        sleeps++;
        if (sleeps >= 3) {
          foreground = true;
        }
      },
      isForeground: () => foreground,
    }).run();

    expect(probe.calls).toBe(1);
    expect(sleeps).toBeGreaterThanOrEqual(3);
  });

  test('waits 5 s between looks while backgrounded', async () => {
    const sleeps: number[] = [];
    let foreground = false;
    await quietPoller(new ScriptedProbe([new HubRegistered()]).call, {
      sleep: async ms => {
        sleeps.push(ms);
        foreground = true;
      },
      isForeground: () => foreground,
    }).run();

    expect(sleeps).toEqual([5_000]);
  });

  test('counts unavailable reasons for the summary event', async () => {
    const probe = new ScriptedProbe([
      new HubCheckUnavailable(HubCheckUnavailableReason.network),
      new HubCheckUnavailable(HubCheckUnavailableReason.network),
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
      new HubNotYetRegistered(),
      new HubRegistered(),
    ]);
    const poller = quietPoller(probe.call);
    await poller.run();

    expect(
      poller.unavailableCounts.get(HubCheckUnavailableReason.network),
    ).toBe(2);
    expect(
      poller.unavailableCounts.get(HubCheckUnavailableReason.authFailed),
    ).toBe(1);
    // A HubNotYetRegistered proves the server was reached.
    expect(poller.everReachedServer).toBe(true);
    expect(poller.completedChecks).toBe(5);
  });

  test('cancel before run means no probe at all', async () => {
    const probe = new ScriptedProbe([new HubRegistered()]);
    const poller = quietPoller(probe.call);
    poller.cancel();
    await poller.run();

    expect(probe.calls).toBe(0);
    expect(poller.isCancelled).toBe(true);
  });

  test('settles auth-expired after three consecutive auth failures', async () => {
    const probe = new ScriptedProbe([
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
    ]);
    let registered = false;
    let authExpired = false;
    await quietPoller(probe.call, {
      onRegistered: () => {
        registered = true;
      },
      onAuthExpired: () => {
        authExpired = true;
      },
    }).run();

    expect(authExpired).toBe(true);
    expect(registered).toBe(false);
    // It stops at once: a dead session gains nothing from a fourth check.
    expect(probe.calls).toBe(3);
  });

  test('a healthy check between two auth failures resets the consecutive count, so the poll keeps going', async () => {
    const probe = new ScriptedProbe([
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
      new HubNotYetRegistered(),
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
      new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
      new HubRegistered(),
    ]);
    let authExpired = false;
    let registered = false;
    await quietPoller(probe.call, {
      onRegistered: () => {
        registered = true;
      },
      onAuthExpired: () => {
        authExpired = true;
      },
    }).run();

    expect(authExpired).toBe(false);
    expect(registered).toBe(true);
    expect(probe.calls).toBe(6);
  });

  test('a throwing probe is classified and the poll continues', async () => {
    let calls = 0;
    let registered = false;
    const poller = quietPoller(
      async () => {
        calls++;
        if (calls === 1) {
          throw new SocketException('no route to host');
        }
        return new HubRegistered();
      },
      {
        onRegistered: () => {
          registered = true;
        },
      },
    );

    await poller.run();

    // A throw must not end the poll: the only exits are success, expiry, the probe and cancel.
    expect(registered).toBe(true);
    expect(calls).toBe(2);
    expect(
      poller.unavailableCounts.get(HubCheckUnavailableReason.network),
    ).toBe(1);
  });
});

/** A poller whose check never succeeds, so only the access-point probe can end it. */
function pollerFinding(
  found: AccessPointProbeResult,
  settled: string[],
  { clock }: { clock?: () => number } = {},
): HubRegistrationPoller {
  let checks = 0;
  const poller: HubRegistrationPoller = new HubRegistrationPoller({
    probe: async () => {
      checks++;
      return new HubNotYetRegistered();
    },
    // No deadline, so the test stops it.
    sleep: async () => {
      if (checks > 6) {
        poller.cancel();
      }
    },
    isForeground: () => true,
    onWaiting: (reason, { showLightReadings = false } = {}) =>
      settled.push(`waiting:${reason}${showLightReadings ? '+readings' : ''}`),
    onRegistered: () => settled.push('registered'),
    onAuthExpired: () => settled.push('auth_expired'),
    accessPointProbe: {
      sinceCredentialAckMs: () =>
        clock?.() ?? (checks >= 1 ? kAccessPointProbeAfter : 0),
      probe: async () => {
        settled.push('probed');
        return found;
      },
      onHubReverted: () => settled.push('reverted'),
    },
  });
  return poller;
}

describe('what the poller does with each probe answer', () => {
  test('a hub on its access point settles as reverted', async () => {
    const settled: string[] = [];
    await pollerFinding(new HubBackInAccessPointMode(), settled).run();

    expect(settled).toContain('reverted');
    expect(settled[settled.length - 1]).toBe('reverted');
  });

  test('it says it is checking the hub before going', async () => {
    const settled: string[] = [];
    await pollerFinding(new HubBackInAccessPointMode(), settled).run();

    expect(settled.slice(-3)).toEqual([
      'waiting:checkingHub',
      'probed',
      'reverted',
    ]);
  });

  test('silence keeps the poll running rather than ending it', async () => {
    const settled: string[] = [];
    await pollerFinding(new HubNotOnAccessPoint(), settled).run();

    // Silence is exactly what a hub that paired produces.
    expect(settled).not.toContain('reverted');
    expect(settled).toContain('waiting:hubNotAnswering+readings');
  });

  test('the readings stick across later checks, and the label does not', async () => {
    const settled: string[] = [];
    await pollerFinding(new HubNotOnAccessPoint(), settled).run();

    const afterProbe = settled
      .slice(settled.indexOf('probed'))
      .filter(s => s.startsWith('waiting:'));
    expect(afterProbe.every(s => s.endsWith('+readings'))).toBe(true);
    expect(afterProbe).toContain('waiting:waitingForHub+readings');
  });

  test('an inconclusive probe settles nothing and keeps polling', async () => {
    const settled: string[] = [];
    await pollerFinding(
      new ProbeInconclusive(new Error('wifi refused')),
      settled,
    ).run();

    expect(settled).not.toContain('reverted');
  });

  test('and it is not retried after failing', async () => {
    const settled: string[] = [];
    await pollerFinding(
      new ProbeInconclusive(new Error('wifi refused')),
      settled,
      // Past the threshold from the first check on, so only the once-only rule stops a second.
      { clock: () => 300_000 },
    ).run();

    expect(settled.filter(s => s === 'probed')).toHaveLength(1);
  });

  test('after the probe it resumes at the slow end (15 s)', async () => {
    const sleeps: number[] = [];
    let checks = 0;
    const poller: HubRegistrationPoller = new HubRegistrationPoller({
      probe: async () => {
        checks++;
        return new HubNotYetRegistered();
      },
      sleep: async ms => {
        sleeps.push(ms);
        poller.cancel();
      },
      isForeground: () => true,
      onWaiting: () => undefined,
      onRegistered: () => undefined,
      onAuthExpired: () => undefined,
      accessPointProbe: {
        sinceCredentialAckMs: () => kAccessPointProbeAfter,
        probe: async () => new HubNotOnAccessPoint(),
        onHubReverted: () => undefined,
      },
    });

    await poller.run();

    expect(checks).toBe(1);
    expect(sleeps).toEqual([15_000]);
  });

  test('a cancel during the probe reports nothing', async () => {
    const settled: string[] = [];
    const poller: HubRegistrationPoller = new HubRegistrationPoller({
      probe: async () => new HubNotYetRegistered(),
      sleep: noSleep,
      isForeground: () => true,
      onWaiting: () => undefined,
      onRegistered: () => settled.push('registered'),
      onAuthExpired: () => settled.push('auth_expired'),
      accessPointProbe: {
        sinceCredentialAckMs: () => kAccessPointProbeAfter,
        probe: async () => {
          // Cancelled while the phone is off on the hub's network.
          poller.cancel();
          return new HubBackInAccessPointMode();
        },
        onHubReverted: () => settled.push('reverted'),
      },
    });

    await poller.run();

    expect(settled).toEqual([]);
  });
});
