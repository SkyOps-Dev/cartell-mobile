// Ported from frontend/test/services/requests/auth_requests_test.dart

import {
  AuthGateway,
  AuthRequestManager,
} from '../../src/services/requests/authRequests';
import type { HttpResponse } from '../../src/services/requests/networkHelper';
import { Result, ResultStatus } from '../../src/services/result';
import { Mode, ModeWatcherHelper } from '../../src/utilities/modeWatcher';

// auth() probes the server mode unless pairing, which short-circuits it to NORMAL.
beforeAll(() => {
  ModeWatcherHelper.isPairingDevices = true;
});
afterAll(() => {
  ModeWatcherHelper.isPairingDevices = false;
});
beforeEach(() => AuthRequestManager.resetSingleFlightForTesting());
afterEach(() => AuthRequestManager.resetSingleFlightForTesting());

const response = (statusCode: number, body = ''): HttpResponse => ({
  statusCode,
  body,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Records calls and returns canned responses, so the session check runs with no I/O. */
class FakeAuthGateway implements AuthGateway {
  verifyCalls = 0;
  refreshCalls = 0;
  verifyResponse = response(401);
  refreshResponse = response(401);
  verifyThrows: unknown = null;
  persistedAccess: string | null = null;
  persistedRefresh: string | null = null;

  constructor(
    private readonly accessToken: string | null,
    private readonly refreshToken: string | null,
  ) {}

  readAccessToken = async () => this.accessToken;
  readRefreshToken = async () => this.refreshToken;
  verify = async () => {
    this.verifyCalls++;
    if (this.verifyThrows !== null) {
      throw this.verifyThrows;
    }
    return this.verifyResponse;
  };
  refresh = async () => {
    this.refreshCalls++;
    return this.refreshResponse;
  };
  persistTokens = async ({
    access,
    refresh,
  }: {
    access: string;
    refresh: string;
  }) => {
    this.persistedAccess = access;
    this.persistedRefresh = refresh;
  };
}

describe('AuthRequestManager.auth — single-flight refresh', () => {
  test('two parallel auth() calls return the same Future and only invoke doAuth once', async () => {
    const pending = deferred<Result>();
    let calls = 0;
    const stub = () => {
      calls++;
      return pending.promise;
    };
    const m = new AuthRequestManager();
    const f1 = m.auth({ doAuth: stub });
    const f2 = m.auth({ doAuth: stub });
    await new Promise(resolve => setImmediate(resolve));

    // While the first is pending, the in-flight future is tracked.
    expect(AuthRequestManager.inFlightAuthForTesting).not.toBeNull();

    pending.resolve(Result.success());
    const [r1, r2] = await Promise.all([f1, f2]);
    // The second concurrent call shares the first call's doAuth.
    expect(calls).toBe(1);
    expect(r1.succeeded).toBe(true);
    expect(r2.succeeded).toBe(true);
  });

  test('clears the in-flight future after a successful refresh', async () => {
    await new AuthRequestManager().auth({
      doAuth: async () => Result.success(),
    });
    expect(AuthRequestManager.inFlightAuthForTesting).toBeNull();
  });

  test('clears the in-flight future after a failed refresh', async () => {
    const result = await new AuthRequestManager().auth({
      doAuth: async () => Result.failure({ message: 'no creds' }),
    });
    expect(result.failed).toBe(true);
    expect(AuthRequestManager.inFlightAuthForTesting).toBeNull();
  });

  test('clears the in-flight future after doAuth throws (try/finally protects against deadlock)', async () => {
    await expect(
      new AuthRequestManager().auth({
        doAuth: async () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');
    // A stale in-flight future would deadlock every later auth() call.
    expect(AuthRequestManager.inFlightAuthForTesting).toBeNull();
  });

  test('a sequential second call invokes doAuth again', async () => {
    let calls = 0;
    const stub = async () => {
      calls++;
      return Result.success();
    };
    const m = new AuthRequestManager();
    await m.auth({ doAuth: stub });
    await m.auth({ doAuth: stub });
    expect(calls).toBe(2);
  });

  test('subsequent parallel pair after a completed refresh re-dedups', async () => {
    let calls = 0;
    const inFlight: ReturnType<typeof deferred<Result>>[] = [];
    const stub = () => {
      const d = deferred<Result>();
      inFlight.push(d);
      calls++;
      return d.promise;
    };
    const m = new AuthRequestManager();
    const f1 = m.auth({ doAuth: stub });
    const f2 = m.auth({ doAuth: stub });
    await new Promise(resolve => setImmediate(resolve));
    inFlight[0].resolve(Result.success());
    await Promise.all([f1, f2]);
    expect(calls).toBe(1);

    const f3 = m.auth({ doAuth: stub });
    const f4 = m.auth({ doAuth: stub });
    await new Promise(resolve => setImmediate(resolve));
    inFlight[1].resolve(Result.success());
    await Promise.all([f3, f4]);
    // A fresh in-flight future is created for the second round.
    expect(calls).toBe(2);
  });
});

describe('AuthRequestManager.auth — lastAuthed cache', () => {
  const counting = () => {
    const counter = { calls: 0 };
    const stub = async () => {
      counter.calls++;
      return Result.success();
    };
    return { counter, stub };
  };

  test('a recent lastAuthed short-circuits auth() before doAuth runs', async () => {
    AuthRequestManager.lastAuthed = Date.now();
    const { counter, stub } = counting();
    const result = await new AuthRequestManager().auth({ doAuth: stub });
    expect(result.succeeded).toBe(true);
    expect(counter.calls).toBe(0);
  });

  test('an old lastAuthed (>60s) does NOT short-circuit', async () => {
    AuthRequestManager.lastAuthed = Date.now() - 61_000;
    const { counter, stub } = counting();
    await new AuthRequestManager().auth({ doAuth: stub });
    expect(counter.calls).toBe(1);
  });

  // The Flutter test's name says 60 s but it uses 59 s; the rule is whole seconds < 60.
  test('exactly-60-seconds-old cache is treated as still valid', async () => {
    AuthRequestManager.lastAuthed = Date.now() - 59_000;
    const { counter, stub } = counting();
    await new AuthRequestManager().auth({ doAuth: stub });
    expect(counter.calls).toBe(0);
  });

  test('shouldForceAuth=true bypasses the cache', async () => {
    AuthRequestManager.lastAuthed = Date.now();
    const { counter, stub } = counting();
    await new AuthRequestManager().auth({
      doAuth: stub,
      shouldForceAuth: true,
    });
    expect(counter.calls).toBe(1);
  });

  test('a null lastAuthed never produces a cache hit', async () => {
    AuthRequestManager.lastAuthed = null;
    const { counter, stub } = counting();
    await new AuthRequestManager().auth({ doAuth: stub });
    expect(counter.calls).toBe(1);
  });
});

describe('_doAuth — exercised through auth() with a fake gateway', () => {
  test('a null access token skips verify and falls through to refresh', async () => {
    const gateway = new FakeAuthGateway(null, null);
    const result = await new AuthRequestManager(gateway).auth();
    expect(gateway.verifyCalls).toBe(0);
    expect(result.status).toBe(ResultStatus.NOT_SIGNED_IN);
  });

  test('no refresh token returns NOT_SIGNED_IN without calling refresh', async () => {
    const gateway = new FakeAuthGateway('stale', null);
    gateway.verifyResponse = response(401);
    const result = await new AuthRequestManager(gateway).auth();
    expect(result.status).toBe(ResultStatus.NOT_SIGNED_IN);
    expect(gateway.refreshCalls).toBe(0);
  });

  test('a valid access token succeeds without refreshing', async () => {
    const gateway = new FakeAuthGateway('good', 'r');
    gateway.verifyResponse = response(200);
    const result = await new AuthRequestManager(gateway).auth();
    expect(result.succeeded).toBe(true);
    expect(gateway.refreshCalls).toBe(0);
  });

  test('a rejected access token refreshes and persists the new pair', async () => {
    const gateway = new FakeAuthGateway('stale', 'r');
    gateway.verifyResponse = response(401);
    gateway.refreshResponse = response(
      200,
      '{"access":"new-a","refresh":"new-r"}',
    );
    const result = await new AuthRequestManager(gateway).auth();
    expect(result.succeeded).toBe(true);
    expect(gateway.persistedAccess).toBe('new-a');
    expect(gateway.persistedRefresh).toBe('new-r');
  });

  test('a verify that throws does not crash the auth loop', async () => {
    const gateway = new FakeAuthGateway('a', null);
    gateway.verifyThrows = new Error('no route to host');
    const result = await new AuthRequestManager(gateway).auth();
    expect(gateway.verifyCalls).toBe(1);
    expect(result.status).toBe(ResultStatus.FAILURE);
  });

  test('a 502 HTML refresh body still reports InvalidTokensException', async () => {
    const gateway = new FakeAuthGateway(null, 'r');
    gateway.refreshResponse = response(502, '<html>502 Bad Gateway</html>');
    const result = await new AuthRequestManager(gateway).auth();
    expect(result.status).toBe(ResultStatus.FAILURE);
    // Only the message shows the body was not decoded before the status check.
    expect(result.messages).toContain(
      'Neither access nor request token were valid.',
    );
  });
});

describe('token helpers signal failure by throwing, never by returning null', () => {
  // Flutter pins the return types in source; here the behaviour itself is checked.
  test('the declared return types are non-nullable http.Response', async () => {
    const fetchMock = jest.fn(async () => ({
      status: 401,
      text: async () => '',
    }));
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    const m = new AuthRequestManager();
    await expect(m.postSecureTokenDataForVerify('t', 'token')).resolves.toEqual(
      {
        statusCode: 401,
        body: '',
      },
    );
    await expect(
      m.postSecureTokenDataForRefresh('t', 'refresh'),
    ).resolves.toEqual({ statusCode: 401, body: '' });
  });

  test('both helpers rethrow after reporting to Sentry', async () => {
    (global as unknown as { fetch: unknown }).fetch = jest.fn(async () => {
      throw new Error('network down');
    });
    const m = new AuthRequestManager();
    await expect(m.postSecureTokenDataForVerify('t', 'token')).rejects.toThrow(
      'network down',
    );
    await expect(
      m.postSecureTokenDataForRefresh('t', 'refresh'),
    ).rejects.toThrow('network down');
  });
});

describe('auth — unreachable server short-circuits before any token I/O', () => {
  test('returns OFFLINE and never touches the gateway', async () => {
    const gateway = new FakeAuthGateway('a', 'r');
    const result = await new AuthRequestManager(gateway).auth({
      probeMode: async () => Mode.UNREACHABLE,
    });
    expect(result.status).toBe(ResultStatus.OFFLINE);
    expect(gateway.verifyCalls).toBe(0);
    expect(gateway.refreshCalls).toBe(0);
  });

  test('MAINTENANCE_MODE does NOT short-circuit', async () => {
    const gateway = new FakeAuthGateway('a', 'r');
    gateway.verifyResponse = response(200);
    const result = await new AuthRequestManager(gateway).auth({
      probeMode: async () => Mode.MAINTENANCE_MODE,
    });
    expect(result.succeeded).toBe(true);
    expect(gateway.verifyCalls).toBe(1);
  });

  test('the offline gate runs before the lastAuthed cache', async () => {
    AuthRequestManager.lastAuthed = Date.now();
    const gateway = new FakeAuthGateway('a', 'r');
    const result = await new AuthRequestManager(gateway).auth({
      probeMode: async () => Mode.UNREACHABLE,
    });
    expect(result.status).toBe(ResultStatus.OFFLINE);
  });
});
