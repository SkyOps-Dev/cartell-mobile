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
  GoToAboutDeviceScreen,
  GoToAddAHubScreen,
  GoToAddHubSuccessScreen,
  GoToDeviceSettingsEvent,
  GoToDevicesHomeScreen,
  GoToEditDeviceScreen,
  GoToSpecificDeviceEvent,
  IsAddingAHubState,
  IsLoadingDevicesScreenState,
  IsOnAboutDeviceScreenState,
  IsOnAddHubSuccessScreen,
  IsOnDeviceSettingsScreen,
  IsOnDevicesHomeScreenState,
  IsOnEditDeviceScreen,
  IsShowingADeviceState,
} from '../../src/state/devices/devicesBloc';
import { RefreshState } from '../../src/state/genericBloc';
import { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { parseDevice } from '../../src/models/device';
import { flush, installFakeServer } from '../helpers/fakeServer';
import { hubJson } from '../helpers/hubJson';

const hub = hubJson();

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
    const held = parseDevice(hub);
    const bloc = new DevicesBloc(mainAppBloc, [held]);
    const states = record(bloc);
    await settle();

    expect(states.map(s => s.constructor.name)).toEqual([
      'IsLoadingDevicesScreenState',
      'IsOnDevicesHomeScreenState',
      'IsOnDevicesHomeScreenState',
    ]);
    // The refetch hands back the same object, merged (one per id, as DataPersistor keeps them).
    expect((states[2] as IsOnDevicesHomeScreenState).devices).toEqual([held]);
    expect((states[2] as IsOnDevicesHomeScreenState).devices[0]).toBe(held);
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

describe('GoToSpecificDeviceEvent (emitThenRefresh)', () => {
  const routes = (hubReply: { status: number; body?: unknown }) => ({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [hub] },
    [`GET /devices/${hub.id}/`]: hubReply,
    [`POST /devices/${hub.id}/message/get_health/`]: {
      status: 202,
      body: { msg: 'Message sent.' },
    },
  });

  /** A bloc already showing the Hubs list. */
  async function onHubsList() {
    const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
    await settle();
    return bloc;
  }

  const shown = (states: DevicesState[]) =>
    states.map(s =>
      s instanceof IsShowingADeviceState
        ? `hub ${s.refresh}`
        : s.constructor.name,
    );

  test('shows the hub at once as checking, then as ready once Node has sent it again', async () => {
    const { requests } = installFakeServer(
      routes({ status: 200, body: { ...hub, name: 'Front Gate' } }),
    );
    const bloc = await onHubsList();
    const device = parseDevice(hub);
    const states = record(bloc);
    bloc.add(new GoToSpecificDeviceEvent(device));
    await settle();

    expect(shown(states)).toEqual([
      'IsOnDevicesHomeScreenState',
      'hub checking',
      'hub ready',
    ]);
    // The same hub throughout, merged with what came back.
    expect((states[2] as IsShowingADeviceState).device).toBe(device);
    expect(device.name).toBe('Front Gate');
    // The health request, then the hub.
    const sent = requests
      .map(r => `${r.method} ${r.path}`)
      .filter(call => !call.includes('maintenance') && !call.includes('jwt'));
    expect(sent.slice(-2)).toEqual([
      `POST /devices/${hub.id}/message/get_health/`,
      `GET /devices/${hub.id}/`,
    ]);
  });

  test('a failed fetch leaves the hub up as last known, with no recovery', async () => {
    installFakeServer(routes({ status: 500, body: '' }));
    const bloc = await onHubsList();
    const recover = jest.spyOn(bloc, 'recover');
    const states = record(bloc);
    bloc.add(new GoToSpecificDeviceEvent(parseDevice(hub)));
    await settle();

    expect(shown(states)).toEqual([
      'IsOnDevicesHomeScreenState',
      'hub checking',
      'hub failed',
    ]);
    expect(recover).not.toHaveBeenCalled();
    expect(bloc.state).toBeInstanceOf(IsShowingADeviceState);
    expect((bloc.state as IsShowingADeviceState).refresh).toBe(
      RefreshState.failed,
    );
  });

  test('leaving before the fetch lands keeps the user where they went', async () => {
    installFakeServer(routes({ status: 200, body: hub }));
    const bloc = await onHubsList();
    const states = record(bloc);
    bloc.add(new GoToSpecificDeviceEvent(parseDevice(hub)));
    bloc.add(new GoToDevicesHomeScreen());
    await settle();

    expect(shown(states)).not.toContain('hub ready');
    expect(bloc.state).toBeInstanceOf(IsOnDevicesHomeScreenState);
  });

  test('the hub page stays off the back stack (not poppable)', () => {
    expect(new IsShowingADeviceState(parseDevice(hub)).isPoppable).toBe(false);
  });
});

describe('Rename and About', () => {
  test('GoToEditDeviceScreen shows the rename page from the hub in hand, with no request', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /devices/': { status: 200, body: [hub] },
    });
    const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
    await settle();
    const before = requests.length;
    const device = parseDevice(hub);
    bloc.add(new GoToEditDeviceScreen(device));
    await settle();
    expect(bloc.state).toBeInstanceOf(IsOnEditDeviceScreen);
    expect((bloc.state as IsOnEditDeviceScreen).device).toBe(device);
    expect(bloc.state.isPoppable).toBe(false);
    expect(requests.length).toBe(before);
  });

  test('GoToAboutDeviceScreen shows About as checking, then as ready once Node has sent the hub', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /devices/': { status: 200, body: [hub] },
      [`GET /devices/${hub.id}/`]: { status: 200, body: hub },
    });
    const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
    await settle();
    const states = record(bloc);
    bloc.add(new GoToAboutDeviceScreen(parseDevice(hub)));
    await settle();
    expect(
      states
        .filter(s => s instanceof IsOnAboutDeviceScreenState)
        .map(s => (s as IsOnAboutDeviceScreenState).refresh),
    ).toEqual([RefreshState.checking, RefreshState.ready]);
    expect(bloc.state.isPoppable).toBe(true);
  });
});

test('GoToDeviceSettingsEvent shows Hub settings as checking, then as ready (not poppable)', async () => {
  installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [hub] },
    [`GET /devices/${hub.id}/`]: { status: 200, body: hub },
  });
  const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
  await settle();
  const states = record(bloc);
  bloc.add(new GoToDeviceSettingsEvent(parseDevice(hub)));
  await settle();
  expect(
    states
      .filter(s => s instanceof IsOnDeviceSettingsScreen)
      .map(s => (s as IsOnDeviceSettingsScreen).refresh),
  ).toEqual([RefreshState.checking, RefreshState.ready]);
  expect(bloc.state.isPoppable).toBe(false);
});

test('Add Hub (poppable, and a second one is the same state), then the hub-added page (not poppable)', async () => {
  installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [hub] },
  });
  const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
  await settle();
  const states = record(bloc);
  bloc.add(new GoToAddAHubScreen());
  bloc.add(new GoToAddAHubScreen());
  await settle();
  expect(states.filter(s => s instanceof IsAddingAHubState)).toHaveLength(1);
  expect(bloc.state.isPoppable).toBe(true);
  const device = parseDevice(hub);
  bloc.add(new GoToAddHubSuccessScreen(device));
  await settle();
  expect(bloc.state).toBeInstanceOf(IsOnAddHubSuccessScreen);
  expect((bloc.state as IsOnAddHubSuccessScreen).device).toBe(device);
  expect(bloc.state.isPoppable).toBe(false);
});
