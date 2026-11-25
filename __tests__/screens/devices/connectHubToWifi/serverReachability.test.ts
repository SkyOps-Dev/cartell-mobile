// Ported from frontend/test/screens/devices/connect_hub_to_wifi/server_reachability_test.dart, plus
// probeServerReachable (utilities.dart) against a fake fetch.

import { installFakeServer } from '../../../helpers/fakeServer';
import { HubCheckUnavailableReason } from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationCheck';
import {
  decideReconnectStep,
  KeepTrying,
  kReconnectWindow,
  reconnectBackoffAfter,
  ReconnectOutcome,
  ServerReachable,
  ServerUnreachable,
  SettleReconnected,
  SettleReconnectFailed,
} from '../../../../src/screens/devices/connectHubToWifi/serverReachability';
import {
  awaitServerReachable,
  probeServerReachable,
} from '../../../../src/screens/devices/connectHubToWifi/utilities';

// The two reasons probeServerReachable can produce: it calls the server directly, so a phone still
// on the hub's network arrives as `network`.
const unreachable = new ServerUnreachable(HubCheckUnavailableReason.network);
const malformed = new ServerUnreachable(HubCheckUnavailableReason.malformed);

describe('decideReconnectStep', () => {
  test('a reachable server settles success immediately', () => {
    expect(
      decideReconnectStep({
        last: new ServerReachable(),
        completedAttempts: 1,
        elapsedMs: 0,
      }),
    ).toBeInstanceOf(SettleReconnected);
  });

  test('a reachable server wins even past the window', () => {
    expect(
      decideReconnectStep({
        last: new ServerReachable(),
        completedAttempts: 40,
        elapsedMs: 300_000,
      }),
    ).toBeInstanceOf(SettleReconnected);
  });

  test('no failure reason ends the loop early, only the window does', () => {
    for (const reason of Object.values(HubCheckUnavailableReason)) {
      expect(
        decideReconnectStep({
          last: new ServerUnreachable(reason),
          completedAttempts: 50,
          elapsedMs: 10_000,
        }),
      ).toBeInstanceOf(KeepTrying);
    }
  });

  test('failure is settled once the window has closed', () => {
    expect(
      decideReconnectStep({
        last: unreachable,
        completedAttempts: 2,
        elapsedMs: kReconnectWindow,
      }),
    ).toBeInstanceOf(SettleReconnectFailed);
  });

  test('backoff is front-loaded, then widens', () => {
    expect(reconnectBackoffAfter(1)).toBe(1_000);
    expect(reconnectBackoffAfter(3)).toBe(1_000);
    expect(reconnectBackoffAfter(4)).toBe(2_000);
    expect(reconnectBackoffAfter(6)).toBe(2_000);
    expect(reconnectBackoffAfter(7)).toBe(5_000);
    expect(reconnectBackoffAfter(99)).toBe(5_000);
  });
});

describe('awaitServerReachable', () => {
  /** A clock that only moves when the loop sleeps. */
  function fakeClock() {
    let now = 0;
    return {
      sleep: async (ms: number) => {
        now += ms;
      },
      elapsedMs: () => now,
    };
  }

  test('a success on the tenth probe still wins', async () => {
    const clock = fakeClock();
    let probes = 0;
    const result = await awaitServerReachable({
      probe: async () => {
        probes += 1;
        return probes < 10 ? unreachable : new ServerReachable();
      },
      ...clock,
    });
    expect(result).toBe(ReconnectOutcome.reachable);
    expect(probes).toBe(10);
  });

  test('transient failures do not consume a budget, only time does', async () => {
    const clock = fakeClock();
    let probes = 0;
    const result = await awaitServerReachable({
      probe: async () => {
        probes += 1;
        return probes <= 30 ? unreachable : new ServerReachable();
      },
      ...clock,
      windowMs: 600_000,
    });
    expect(result).toBe(ReconnectOutcome.reachable);
    expect(probes).toBe(31);
  });

  test('a server that never answers fails once the window closes', async () => {
    const clock = fakeClock();
    const result = await awaitServerReachable({
      probe: async () => unreachable,
      ...clock,
    });
    expect(result).toBe(ReconnectOutcome.windowClosed);
    expect(clock.elapsedMs()).toBeGreaterThanOrEqual(kReconnectWindow);
  });

  test('a malformed failure is indeterminate like any other', async () => {
    const clock = fakeClock();
    let probes = 0;
    const result = await awaitServerReachable({
      probe: async () => {
        probes += 1;
        return probes < 5 ? malformed : new ServerReachable();
      },
      ...clock,
    });
    expect(result).toBe(ReconnectOutcome.reachable);
  });

  test('cancelling stops the loop instead of holding the user', async () => {
    // Cancelled is not windowClosed: the caller says "could not reconnect" only for the latter.
    const clock = fakeClock();
    let probes = 0;
    const result = await awaitServerReachable({
      probe: async () => {
        probes += 1;
        return unreachable;
      },
      ...clock,
      isCancelled: () => probes >= 3,
    });
    expect(result).toBe(ReconnectOutcome.cancelled);
    expect(probes).toBe(3);
  });

  test('a loop cancelled before it starts never probes', async () => {
    let probes = 0;
    const result = await awaitServerReachable({
      probe: async () => {
        probes += 1;
        return unreachable;
      },
      isCancelled: () => true,
    });
    expect(result).toBe(ReconnectOutcome.cancelled);
    expect(probes).toBe(0);
  });
});

describe('probeServerReachable', () => {
  test("any answer from Django's /test/, whatever its status, is reachable", async () => {
    const { requests } = installFakeServer({ 'GET /test/': { status: 500 } });
    expect(await probeServerReachable()).toBeInstanceOf(ServerReachable);
    expect(requests.map(r => `${r.method} ${r.path}`)).toEqual(['GET /test/']);
    // Straight to the server: no session, no maintenance check first.
    expect(requests[0].headers).toEqual({});
  });

  test('no answer at all is network', async () => {
    installFakeServer({
      'GET /test/': () => {
        throw new TypeError('Network request failed');
      },
    });
    const result = await probeServerReachable();
    expect(result).toBeInstanceOf(ServerUnreachable);
    expect((result as ServerUnreachable).reason).toBe(
      HubCheckUnavailableReason.network,
    );
  });

  test('15 s without an answer is network', async () => {
    jest.useFakeTimers();
    try {
      (global as unknown as { fetch: unknown }).fetch = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new Error('Aborted')),
            );
          }),
      );
      const pending = probeServerReachable();
      await jest.advanceTimersByTimeAsync(15_000);
      const result = await pending;
      expect((result as ServerUnreachable).reason).toBe(
        HubCheckUnavailableReason.network,
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
