// The hubs area's state machine (spec 06 §5). The recovery test is ported from
// frontend/test/bloc/devices/recovery_after_close_test.dart (#552: recovery outlives its bloc and
// must not dispatch into a closed one).

import * as Keychain from 'react-native-keychain';

import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { Result } from '../../src/services/result';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc } from '../../src/state/auth/authBloc';
import {
  DevicesBloc,
  DevicesState,
  IsLoadingDevicesScreenState,
  IsOnDevicesHomeScreenState,
} from '../../src/state/devices/devicesBloc';
import { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';

const hub = { id: 7, name: 'Gate', device: { is_connected: true } };

let authBloc: AuthBloc;
let mainAppBloc: MainAppBloc;

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

beforeEach(async () => {
  AuthRequestManager.resetSingleFlightForTesting();
  keychain.clear();
  installFakeServer({ 'GET /maintenance-mode/': { status: 200 } });
  // No session yet, so the AuthBloc's own launch auto-login stops at Welcome and stays out of the
  // way; then a session is stored for the hubs requests.
  authBloc = new AuthBloc();
  for (let i = 0; i < 10; i++) {
    await flush();
  }
  await SecureStorage.setAccessToken('A');
  await SecureStorage.setRefreshToken('R');
  mainAppBloc = new MainAppBloc(authBloc);
  await flush();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function record(bloc: DevicesBloc) {
  const states: DevicesState[] = [bloc.state];
  bloc.subscribe(() => states.push(bloc.state));
  return states;
}

async function settle() {
  for (let i = 0; i < 20; i++) {
    await flush();
  }
}

describe('GoToDevicesHomeScreen, dispatched by the constructor', () => {
  test('with no hubs from sign-in: loading, a fresh GET /devices/, then the Hubs list', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /devices/': { status: 200, body: [] },
    });
    const bloc = new DevicesBloc(mainAppBloc, []);
    // flutter_bloc handles events asynchronously: the first frame is the loading state.
    expect(bloc.state).toBeInstanceOf(IsLoadingDevicesScreenState);
    const states = record(bloc);
    await settle();

    expect(states.map(s => s.constructor.name)).toEqual([
      'IsLoadingDevicesScreenState',
      'IsLoadingDevicesScreenState',
      'IsOnDevicesHomeScreenState',
    ]);
    expect(
      requests.filter(r => r.path === '/devices/').map(r => r.method),
    ).toEqual(['GET']);
    expect(bloc.devices).toEqual([]);
  });

  test('with hubs from sign-in: the list at once, then again after the refetch', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /devices/': { status: 200, body: [hub] },
    });
    const bloc = new DevicesBloc(mainAppBloc, [hub]);
    const states = record(bloc);
    await settle();

    expect(states.map(s => s.constructor.name)).toEqual([
      'IsLoadingDevicesScreenState',
      'IsOnDevicesHomeScreenState',
      'IsOnDevicesHomeScreenState',
    ]);
    expect((states[2] as IsOnDevicesHomeScreenState).devices).toEqual([hub]);
  });

  test('a failed fetch leaves the loading screen up and starts recovery', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /devices/': { status: 500, body: '' },
    });
    const recover = jest
      .spyOn(DevicesBloc.prototype, 'recover')
      .mockResolvedValue();
    const bloc = new DevicesBloc(mainAppBloc, []);
    await settle();
    expect(bloc.state).toBeInstanceOf(IsLoadingDevicesScreenState);
    expect(recover).toHaveBeenCalledTimes(1);
  });
});

describe('recovery that outlives its bloc', () => {
  test('does not dispatch into a closed bloc', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.success());
    const bloc = new DevicesBloc(mainAppBloc, []);
    const add = jest.spyOn(bloc, 'add').mockImplementation(() => {});
    await Promise.resolve(); // the constructor's own GoToDevicesHomeScreen
    add.mockClear();

    const recovery = bloc.recover();
    bloc.close();
    mainAppBloc.close();
    authBloc.close();
    await jest.advanceTimersByTimeAsync(4000);
    await recovery;

    expect(add).not.toHaveBeenCalled();
  });

  test('a dead session sends auto sign-in to the AuthBloc while it is open', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    const authAdds = jest.spyOn(authBloc, 'add');
    const bloc = new DevicesBloc(mainAppBloc, []);
    await bloc.recover();
    expect(authAdds).toHaveBeenCalledTimes(1);

    authBloc.close();
    await bloc.recover();
    expect(authAdds).toHaveBeenCalledTimes(1);
  });

  test('retries after 1, 2 and 3 s, then gives up', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.success());
    const bloc = new DevicesBloc(mainAppBloc, []);
    const add = jest.spyOn(bloc, 'add').mockImplementation(() => {});
    await Promise.resolve(); // the constructor's own GoToDevicesHomeScreen
    add.mockClear();

    for (const seconds of [1, 2, 3]) {
      const recovery = bloc.recover();
      await jest.advanceTimersByTimeAsync(seconds * 1000 - 1);
      expect(add).toHaveBeenCalledTimes(seconds - 1);
      await jest.advanceTimersByTimeAsync(1);
      await recovery;
      expect(add).toHaveBeenCalledTimes(seconds);
    }
    await bloc.recover();
    expect(add).toHaveBeenCalledTimes(3);
    expect(bloc.recoveryAttempts).toBe(4);
  });
});
