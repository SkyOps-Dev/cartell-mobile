// Auto-login. Ported from the AutoLoginEvent rules in
// frontend/test/services/legacy_credential_purge_wiring_test.dart (which reads the Dart source) and
// from the behaviour in spec 08 §3 / feature page 01, checked by running the event against a fake
// server and the in-memory keychain.

import * as Keychain from 'react-native-keychain';

import { getEnvironmentName } from '../../src/config/environment';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import {
  AuthBloc,
  AuthState,
  IsLoadingAppState,
  IsOnDevicesScreenState,
  IsOnWelcomeScreenState,
} from '../../src/state/auth/authBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';

const keychain = Keychain as unknown as {
  __store: Map<string, unknown>;
  resetGenericPassword: jest.Mock;
  getGenericPassword: jest.Mock;
};

const legacyKeys = ['password', 'email', 'false'].map(
  suffix => `${getEnvironmentName()}_${suffix}`,
);

beforeEach(() => {
  AuthRequestManager.resetSingleFlightForTesting();
  keychain.__store.clear();
  jest.clearAllMocks();
});

async function signIn(access = 'A', refresh: string | null = 'R') {
  await SecureStorage.setAccessToken(access);
  if (refresh !== null) {
    await SecureStorage.setRefreshToken(refresh);
  }
}

/** Creates the bloc (which starts auto-login, as on launch) and records every state. */
async function launch() {
  const bloc = new AuthBloc();
  const states: AuthState[] = [bloc.state];
  bloc.subscribe(() => states.push(bloc.state));
  for (let i = 0; i < 40; i++) {
    await flush();
  }
  return { bloc, states };
}

const ok = { status: 200 };
const hubs = [
  { id: 7, name: 'Gate', device: { is_connected: true } },
  { id: 8, name: 'Barn', device: { is_connected: false } },
];
const user = {
  id: 1,
  email: 'a@b.com',
  first_name: 'A',
  last_name: 'B',
  phone_no: '',
  should_send_emails: true,
};
const signedInServer = {
  'GET /maintenance-mode/': ok,
  'POST /auth/jwt/verify': ok,
  'GET /devices/': { status: 200, body: hubs },
  'POST /devices/7/message/get_health/': ok,
  'GET /auth/users/me/': { status: 200, body: user },
};
const calls = (requests: { method: string; path: string }[]) =>
  requests
    .map(r => `${r.method} ${r.path}`)
    .filter(call => call !== 'GET /maintenance-mode/');

describe('AutoLoginEvent: launch', () => {
  test('the bloc starts on the Loading screen and runs auto-login itself', async () => {
    installFakeServer(signedInServer);
    const bloc = new AuthBloc();
    expect(bloc.state).toBeInstanceOf(IsLoadingAppState);
    expect(bloc.state.isPoppable).toBe(false);
    for (let i = 0; i < 40; i++) {
      await flush();
    }
    expect(bloc.state).toBeInstanceOf(IsOnWelcomeScreenState);
  });

  test('no access token: Welcome, with no request sent', async () => {
    const { requests } = installFakeServer(signedInServer);
    const { states } = await launch();
    expect(states[states.length - 1]).toBeInstanceOf(IsOnWelcomeScreenState);
    expect(requests).toHaveLength(0);
  });
});

describe('AutoLoginEvent: the legacy purge', () => {
  test('runs above the access-token check, so signed-out installs are purged too', async () => {
    installFakeServer(signedInServer);
    for (const name of legacyKeys) {
      await Keychain.setGenericPassword(name, 'old', { service: name });
    }
    await launch();
    for (const name of legacyKeys) {
      expect(keychain.__store.has(name)).toBe(false);
    }
  });

  test('runs once per launch, not once per attempt', async () => {
    installFakeServer({
      'GET /maintenance-mode/': ok,
      'POST /auth/jwt/verify': { status: 401 },
    });
    await signIn('A', null);
    await launch();
    const purged = keychain.resetGenericPassword.mock.calls.filter(([o]) =>
      legacyKeys.includes(o.service),
    );
    expect(purged).toHaveLength(3);
  });

  test('a failing purge never decides whether the session survives', async () => {
    installFakeServer(signedInServer);
    await signIn();
    keychain.resetGenericPassword.mockImplementationOnce(async () => {
      throw new Error('keystore unavailable');
    });
    const { states } = await launch();
    expect(states[states.length - 1]).toBeInstanceOf(IsOnDevicesScreenState);
  });

  test('a throwing keychain read lands on Welcome, not on Loading forever', async () => {
    installFakeServer(signedInServer);
    keychain.getGenericPassword.mockImplementationOnce(async () => {
      throw new Error('keystore unavailable');
    });
    const { states } = await launch();
    expect(states[states.length - 1]).toBeInstanceOf(IsOnWelcomeScreenState);
  });
});

describe('AutoLoginEvent: signing in', () => {
  test('success makes the same calls in the same order and opens the hubs', async () => {
    const { requests } = installFakeServer(signedInServer);
    await signIn();
    const { states } = await launch();

    const last = states[states.length - 1] as IsOnDevicesScreenState;
    expect(last).toBeInstanceOf(IsOnDevicesScreenState);
    expect(last.email).toBeNull();
    expect(last.password).toBeNull();
    expect(last.devices).toEqual(hubs);
    // The hub list twice, get_health for the connected hub only.
    expect(calls(requests)).toEqual([
      'POST /auth/jwt/verify',
      'GET /devices/',
      'POST /devices/7/message/get_health/',
      'GET /auth/users/me/',
      'GET /devices/',
    ]);
    // A maintenance probe precedes every request, and each session check probes first.
    expect(requests.map(r => r.path)).toEqual([
      '/maintenance-mode/',
      '/maintenance-mode/',
      '/auth/jwt/verify',
      '/maintenance-mode/',
      '/maintenance-mode/',
      '/devices/',
      '/maintenance-mode/',
      '/maintenance-mode/',
      '/devices/7/message/get_health/',
      '/maintenance-mode/',
      '/maintenance-mode/',
      '/auth/users/me/',
      '/maintenance-mode/',
      '/maintenance-mode/',
      '/devices/',
    ]);
    const health = requests.find(r => r.path.endsWith('/get_health/'))!;
    expect(health.headers.authorization).toBe('JWT A');
  });

  test('a failed get_health is only reported; sign-in carries on', async () => {
    installFakeServer({
      ...signedInServer,
      'POST /devices/7/message/get_health/': { status: 500 },
    });
    await signIn();
    const { states } = await launch();
    expect(states[states.length - 1]).toBeInstanceOf(IsOnDevicesScreenState);
  });

  test('three failed session checks: Welcome, and the tokens are kept', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      'POST /auth/jwt/verify': { status: 401 },
      'POST /auth/jwt/refresh': { status: 401 },
    });
    await signIn();
    const { states } = await launch();
    expect(states[states.length - 1]).toBeInstanceOf(IsOnWelcomeScreenState);
    expect(calls(requests)).toEqual([
      'POST /auth/jwt/verify',
      'POST /auth/jwt/refresh',
      'POST /auth/jwt/verify',
      'POST /auth/jwt/refresh',
      'POST /auth/jwt/verify',
      'POST /auth/jwt/refresh',
    ]);
    expect(await SecureStorage.getAccessToken()).toBe('A');
    expect(await SecureStorage.getRefreshToken()).toBe('R');
  });

  test('a later attempt that succeeds signs in', async () => {
    let verifies = 0;
    const { fetchMock } = installFakeServer(signedInServer);
    const real = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (new URL(url).pathname === '/auth/jwt/verify') {
        verifies += 1;
        const status = verifies < 3 ? 401 : 200;
        return { status, text: async () => '' } as unknown as Response;
      }
      return real(url, init);
    });
    await signIn('A', null);
    const { states } = await launch();
    expect(verifies).toBe(3);
    expect(states[states.length - 1]).toBeInstanceOf(IsOnDevicesScreenState);
  });

  test('anything thrown lands on Welcome without another attempt', async () => {
    const { requests } = installFakeServer({
      ...signedInServer,
      'GET /auth/users/me/': { status: 500 },
    });
    await signIn();
    const { states } = await launch();
    expect(states[states.length - 1]).toBeInstanceOf(IsOnWelcomeScreenState);
    expect(calls(requests).filter(c => c === 'GET /auth/users/me/')).toEqual([
      'GET /auth/users/me/',
    ]);
  });

  test('the Loading screen shows for the whole attempt', async () => {
    installFakeServer(signedInServer);
    await signIn();
    const { states } = await launch();
    expect(states.slice(0, -1).every(s => s instanceof IsLoadingAppState)).toBe(
      true,
    );
  });
});
