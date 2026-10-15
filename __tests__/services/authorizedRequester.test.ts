// Ported from frontend/test/services/requests/authorized_requester_test.dart

import {
  AuthExpiredException,
  TimeOutException,
} from '../../src/services/exceptions';
import { AuthorizedRequester } from '../../src/services/requests/networkHelper';
import { Result } from '../../src/services/result';

const ok = { statusCode: 200, body: 'ok' };
const unauthorized = { statusCode: 401, body: '' };
const serverError = { statusCode: 500, body: '' };

describe('AuthorizedRequester.execute', () => {
  test('returns the response directly when the request succeeds', async () => {
    const requester = new AuthorizedRequester(async () => {
      throw new Error('refresh should not be called on success');
    });
    const response = await requester.execute(async () => ok);
    expect(response.statusCode).toBe(200);
  });

  test('returns the response directly on non-401 errors (no retry)', async () => {
    let calls = 0;
    const requester = new AuthorizedRequester(async () => {
      throw new Error('refresh should not be called on a 500 response');
    });
    const response = await requester.execute(async () => {
      calls++;
      return serverError;
    });
    expect(calls).toBe(1);
    expect(response.statusCode).toBe(500);
  });

  test('refreshes and retries once when the response is 401', async () => {
    let calls = 0;
    let refreshes = 0;
    const requester = new AuthorizedRequester(async () => {
      refreshes++;
      return Result.success();
    });
    const response = await requester.execute(async () => {
      calls++;
      return calls === 1 ? unauthorized : ok;
    });
    expect(refreshes).toBe(1);
    expect(calls).toBe(2);
    expect(response.statusCode).toBe(200);
  });

  test('throws AuthExpiredException when refresh fails on a 401', async () => {
    const requester = new AuthorizedRequester(async () =>
      Result.failure({ message: 'refresh rejected' }),
    );
    await expect(requester.execute(async () => unauthorized)).rejects.toThrow(
      AuthExpiredException,
    );
  });

  test('returns the retry response even if it is still 401', async () => {
    let calls = 0;
    const requester = new AuthorizedRequester(async () => Result.success());
    const response = await requester.execute(async () => {
      calls++;
      return unauthorized;
    });
    expect(calls).toBe(2);
    expect(response.statusCode).toBe(401);
  });

  test('passes shouldForceAuth=true to the refresh callback', async () => {
    let forced: boolean | null = null;
    const requester = new AuthorizedRequester(async ({ shouldForceAuth }) => {
      forced = shouldForceAuth;
      return Result.success();
    });
    await requester.execute(async () => unauthorized);
    // 401 retries bypass the auth-result cache.
    expect(forced).toBe(true);
  });

  describe('a 401 retry on an unreachable server is not an expired session', () => {
    test('an OFFLINE refresh throws TimeOutException, not AuthExpiredException', async () => {
      const requester = new AuthorizedRequester(async () => Result.offline());
      let thrown: unknown;
      try {
        await requester.execute(async () => unauthorized);
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(TimeOutException);
      expect(thrown).not.toBeInstanceOf(AuthExpiredException);
    });

    test('a genuine FAILURE refresh still throws AuthExpiredException', async () => {
      const requester = new AuthorizedRequester(async () =>
        Result.failure({ message: 'rejected' }),
      );
      await expect(requester.execute(async () => unauthorized)).rejects.toThrow(
        AuthExpiredException,
      );
    });
  });
});
