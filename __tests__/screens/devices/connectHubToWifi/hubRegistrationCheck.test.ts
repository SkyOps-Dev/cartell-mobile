// Ported from frontend/test/screens/devices/connect_hub_to_wifi/hub_registration_check_test.dart
// and the "decidePollStep — when to go looking" group of access_point_probe_test.dart.

import {
  AuthExpiredException,
  OnHUBNetworkException,
  SocketException,
  TimeOutException,
} from '../../../../src/services/exceptions';
import {
  classifyProbeFailure,
  decidePollStep,
  HubCheckUnavailable,
  HubCheckUnavailableReason,
  HubNotYetRegistered,
  HubRegistered,
  HubRegistrationCheck,
  isForegroundLifecycle,
  kAccessPointProbeAfter,
  KeepPolling,
  RunAccessPointProbe,
  SettleAuthExpired,
  SettleSucceeded,
  WaitingReason,
} from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationCheck';

describe('classifyProbeFailure', () => {
  test('maps OnHUBNetworkException to stillOnHubNetwork', () => {
    // The phone has not rejoined its own Wi-Fi yet: not a statement about the hub.
    expect(classifyProbeFailure(new OnHUBNetworkException())).toBe(
      HubCheckUnavailableReason.stillOnHubNetwork,
    );
  });

  test('maps AuthExpiredException to authFailed', () => {
    expect(
      classifyProbeFailure(new AuthExpiredException('refresh rejected')),
    ).toBe(HubCheckUnavailableReason.authFailed);
  });

  test('maps TimeOutException to network', () => {
    expect(classifyProbeFailure(new TimeOutException())).toBe(
      HubCheckUnavailableReason.network,
    );
  });

  test('maps SocketException to network', () => {
    expect(classifyProbeFailure(new SocketException('no route to host'))).toBe(
      HubCheckUnavailableReason.network,
    );
  });

  test("maps fetch's no-answer TypeError to network, as package:http's SocketException", () => {
    expect(classifyProbeFailure(new TypeError('Network request failed'))).toBe(
      HubCheckUnavailableReason.network,
    );
  });

  test('maps an unrecognised error to malformed', () => {
    expect(
      classifyProbeFailure(new SyntaxError('unexpected end of input')),
    ).toBe(HubCheckUnavailableReason.malformed);
  });
});

describe('HubRegistrationCheck', () => {
  test('HubNotYetRegistered is distinct from HubCheckUnavailable', () => {
    const unavailable = new HubCheckUnavailable(
      HubCheckUnavailableReason.network,
    );
    // Collapsing these two is the original bug.
    expect(new HubNotYetRegistered()).not.toBeInstanceOf(HubCheckUnavailable);
    expect(unavailable.reason).toBe(HubCheckUnavailableReason.network);
  });
});

describe('decidePollStep', () => {
  test('settles as succeeded on HubRegistered', () => {
    expect(
      decidePollStep({
        last: new HubRegistered(),
        completedChecks: 1,
        consecutiveAuthFailures: 0,
      }),
    ).toBeInstanceOf(SettleSucceeded);
  });

  test('HubRegistered settles even mid-way through an auth-failure streak', () => {
    expect(
      decidePollStep({
        last: new HubRegistered(),
        completedChecks: 5,
        consecutiveAuthFailures: 2,
      }),
    ).toBeInstanceOf(SettleSucceeded);
  });

  test('never settles on HubNotYetRegistered, however many checks', () => {
    // There is no deadline: "not yet" is never "never".
    for (const n of [1, 7, 50, 500]) {
      expect(
        decidePollStep({
          last: new HubNotYetRegistered(),
          completedChecks: n,
          consecutiveAuthFailures: 0,
        }),
      ).toBeInstanceOf(KeepPolling);
    }
  });

  test('never settles on HubCheckUnavailable, however many checks', () => {
    for (const n of [1, 7, 50, 500]) {
      expect(
        decidePollStep({
          last: new HubCheckUnavailable(HubCheckUnavailableReason.network),
          completedChecks: n,
          consecutiveAuthFailures: 0,
        }),
      ).toBeInstanceOf(KeepPolling);
    }
  });

  test('backs off 2s for checks 1-3, 5s for 4-6, 15s for 7-12, 60s from 13 on', () => {
    // With the probe already run, so the schedule is measured on its own.
    const delayAfter = (completedChecks: number) =>
      (
        decidePollStep({
          last: new HubNotYetRegistered(),
          completedChecks,
          consecutiveAuthFailures: 0,
          accessPointProbed: true,
        }) as KeepPolling
      ).delayMs;

    expect(delayAfter(1)).toBe(2_000);
    expect(delayAfter(3)).toBe(2_000);
    expect(delayAfter(4)).toBe(5_000);
    expect(delayAfter(6)).toBe(5_000);
    expect(delayAfter(7)).toBe(15_000);
    expect(delayAfter(12)).toBe(15_000);
    expect(delayAfter(13)).toBe(60_000);
    // The cap holds, so an unbounded poll stays cheap even overnight.
    expect(delayAfter(500)).toBe(60_000);
  });

  test('reports rejoiningNetwork while still on the hub AP', () => {
    const decision = decidePollStep({
      last: new HubCheckUnavailable(
        HubCheckUnavailableReason.stillOnHubNetwork,
      ),
      completedChecks: 1,
      consecutiveAuthFailures: 0,
    }) as KeepPolling;
    expect(decision.display).toBe(WaitingReason.rejoiningNetwork);
  });

  test('reports waitingForHub when the server answered healthily', () => {
    const decision = decidePollStep({
      last: new HubNotYetRegistered(),
      completedChecks: 1,
      consecutiveAuthFailures: 0,
    }) as KeepPolling;
    expect(decision.display).toBe(WaitingReason.waitingForHub);
  });

  test('reports reachingServer for every other unavailable reason', () => {
    for (const reason of [
      HubCheckUnavailableReason.authFailed,
      HubCheckUnavailableReason.network,
      HubCheckUnavailableReason.server,
      HubCheckUnavailableReason.malformed,
    ]) {
      const decision = decidePollStep({
        last: new HubCheckUnavailable(reason),
        completedChecks: 1,
        consecutiveAuthFailures: 0,
      }) as KeepPolling;
      expect(decision.display).toBe(WaitingReason.reachingServer);
    }
  });

  describe('SettleAuthExpired (a dead session is a definite negative)', () => {
    test('keeps polling on the first and second consecutive auth failure', () => {
      // Three in a row, so one transient refresh blip does not settle it.
      for (const n of [1, 2]) {
        expect(
          decidePollStep({
            last: new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
            completedChecks: n,
            consecutiveAuthFailures: n,
          }),
        ).toBeInstanceOf(KeepPolling);
      }
    });

    test('settles as SettleAuthExpired on the third consecutive auth failure', () => {
      expect(
        decidePollStep({
          last: new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
          completedChecks: 3,
          consecutiveAuthFailures: 3,
        }),
      ).toBeInstanceOf(SettleAuthExpired);
    });

    test('keeps settling for any further consecutive count past three', () => {
      expect(
        decidePollStep({
          last: new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
          completedChecks: 40,
          consecutiveAuthFailures: 12,
        }),
      ).toBeInstanceOf(SettleAuthExpired);
    });

    test('a high consecutive count does not settle a non-authFailed check', () => {
      expect(
        decidePollStep({
          last: new HubCheckUnavailable(HubCheckUnavailableReason.network),
          completedChecks: 10,
          consecutiveAuthFailures: 5,
        }),
      ).toBeInstanceOf(KeepPolling);
    });
  });
});

describe('decidePollStep — when to go looking', () => {
  const decide = ({
    since = 0,
    probed = false,
    foreground = true,
    checks = 1,
    last = new HubNotYetRegistered() as HubRegistrationCheck,
  } = {}) =>
    decidePollStep({
      last,
      completedChecks: checks,
      consecutiveAuthFailures: 0,
      sinceCredentialAckMs: since,
      accessPointProbed: probed,
      isForeground: foreground,
    });

  test('waits until the threshold', () => {
    expect(decide({ since: kAccessPointProbeAfter - 1_000 })).toBeInstanceOf(
      KeepPolling,
    );
    expect(decide({ since: kAccessPointProbeAfter })).toBeInstanceOf(
      RunAccessPointProbe,
    );
  });

  test('asks only once', () => {
    // A second trip costs another spell off the user's network and learns nothing new.
    expect(decide({ since: 300_000, probed: true })).toBeInstanceOf(
      KeepPolling,
    );
  });

  test('never while the app is in the background', () => {
    expect(decide({ since: 300_000, foreground: false })).toBeInstanceOf(
      KeepPolling,
    );
  });

  test('never while the phone is still on the hub network', () => {
    // From there a probe would blame the hub for a fault on the phone.
    expect(
      decide({
        since: 300_000,
        last: new HubCheckUnavailable(
          HubCheckUnavailableReason.stillOnHubNetwork,
        ),
      }),
    ).toBeInstanceOf(KeepPolling);
  });

  test('a server the phone cannot reach does not block the probe', () => {
    // A router that lost power: the hub reverts and the phone cannot reach the server either.
    expect(
      decide({
        since: 300_000,
        last: new HubCheckUnavailable(HubCheckUnavailableReason.network),
      }),
    ).toBeInstanceOf(RunAccessPointProbe);
  });

  test('a hub that registered is not probed', () => {
    expect(
      decide({ since: 300_000, last: new HubRegistered() }),
    ).toBeInstanceOf(SettleSucceeded);
  });

  describe('the wait never overshoots the threshold', () => {
    test('a backoff that would sleep past it is cut short', () => {
      // Tier 3, a 15 s backoff.
      const decision = decide({
        checks: 7,
        since: kAccessPointProbeAfter - 4_000,
      }) as KeepPolling;
      expect(decision.delayMs).toBe(4_000);
    });

    test('a backoff that lands before it is left alone', () => {
      const decision = decide({ checks: 7, since: 5_000 }) as KeepPolling;
      expect(decision.delayMs).toBe(15_000);
    });

    test('and is not clamped once the probe has run', () => {
      const decision = decide({
        checks: 7,
        probed: true,
        since: kAccessPointProbeAfter - 4_000,
      }) as KeepPolling;
      expect(decision.delayMs).toBe(15_000);
    });
  });

  test('a dead session is not probed', () => {
    expect(
      decidePollStep({
        last: new HubCheckUnavailable(HubCheckUnavailableReason.authFailed),
        completedChecks: 9,
        consecutiveAuthFailures: 3,
        sinceCredentialAckMs: 300_000,
      }),
    ).toBeInstanceOf(SettleAuthExpired);
  });
});

describe('isForegroundLifecycle', () => {
  test('no report yet counts as foreground (null, and React Native\'s "unknown")', () => {
    // The first check must not be stalled at start-up.
    expect(isForegroundLifecycle(null)).toBe(true);
    expect(isForegroundLifecycle(undefined)).toBe(true);
    expect(isForegroundLifecycle('unknown')).toBe(true);
  });

  test('active (Flutter: resumed) counts as foreground', () => {
    expect(isForegroundLifecycle('active')).toBe(true);
  });

  test('inactive counts as foreground', () => {
    // iOS reports it while a system Wi-Fi or permission alert is up: exactly the moment waited on.
    expect(isForegroundLifecycle('inactive')).toBe(true);
  });

  test('background (Flutter: paused, hidden, detached) does not', () => {
    expect(isForegroundLifecycle('background')).toBe(false);
  });

  test('extension does not', () => {
    expect(isForegroundLifecycle('extension')).toBe(false);
  });
});
