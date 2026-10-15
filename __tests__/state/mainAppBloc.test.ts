// Ported from frontend/test/bloc/main_app/go_to_hubs_screen_event_test.dart (Troy's 9/22 checklist,
// row 7: the HUBs entry did nothing from inside a hub, because MainAppBloc re-emitted and the shell
// kept its old DevicesBloc). Plus the shell's start and recovery (spec 06 §4).

import * as Keychain from 'react-native-keychain';

import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { Result } from '../../src/services/result';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc, AutoLoginEvent } from '../../src/state/auth/authBloc';
import {
  DevicesBloc,
  DevicesEvent,
  GoToDevicesHomeScreen,
} from '../../src/state/devices/devicesBloc';
import {
  GoToHubsScreenEvent,
  IsLoadingMainAppState,
  IsOnHubsScreenState,
  MainAppBloc,
  MainAppState,
} from '../../src/state/mainApp/mainAppBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';

/** Records what it is sent instead of handling it, so nothing here fetches. */
class RecordingDevicesBloc extends DevicesBloc {
  sent: DevicesEvent[] = [];
  add(event: DevicesEvent) {
    this.sent.push(event);
  }
}

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
  mainAppBloc.close();
  authBloc.close();
  jest.restoreAllMocks();
});

test('starts on the loading state and dispatches GoToHubsScreenEvent itself', () => {
  const fresh = new MainAppBloc(authBloc);
  expect(fresh.fallbackState).toBeInstanceOf(IsOnHubsScreenState);
  // The constructor's event lands at once: by the time the shell is shown it is on Hubs.
  expect(fresh.state).toBeInstanceOf(IsOnHubsScreenState);
  expect(mainAppBloc.state).toBeInstanceOf(IsOnHubsScreenState);
  expect(new IsLoadingMainAppState().isPoppable).toBe(false);
  fresh.close();
});

test('from inside the hubs flow, sends the live DevicesBloc home', async () => {
  const devices = new RecordingDevicesBloc(mainAppBloc, []);
  mainAppBloc.bloc = devices;
  await flush();
  devices.sent = []; // its constructor's own GoToDevicesHomeScreen
  const emitted: MainAppState[] = [];
  mainAppBloc.subscribe(() => emitted.push(mainAppBloc.state));

  mainAppBloc.add(new GoToHubsScreenEvent());
  await flush();

  expect(devices.sent).toHaveLength(1);
  expect(devices.sent[0]).toBeInstanceOf(GoToDevicesHomeScreen);
  // A re-emit builds a DevicesBloc the screen never uses and points mainAppBloc.bloc at it.
  expect(emitted).toHaveLength(0);
  devices.close();
});

// LATER(part 20): "from another screen, still switches to the hubs screen" (GoToContactUsScreen,
// then GoToHubsScreenEvent emits Hubs and sends the still-open DevicesBloc nothing) needs a second
// MainApp screen to exist.

test('a closed DevicesBloc falls back to emitting', async () => {
  const devices = new RecordingDevicesBloc(mainAppBloc, []);
  mainAppBloc.bloc = devices;
  devices.close();
  const emitted: MainAppState[] = [];
  mainAppBloc.subscribe(() => emitted.push(mainAppBloc.state));

  mainAppBloc.add(new GoToHubsScreenEvent());
  await flush();

  expect(emitted).toHaveLength(1);
  expect(emitted[0]).toBeInstanceOf(IsOnHubsScreenState);
});

test('every state is distinct, so a second Hubs state is emitted', () => {
  expect(new IsOnHubsScreenState().props).not.toEqual(
    new IsOnHubsScreenState().props,
  );
});

describe('recovery after a failed event', () => {
  const failingEvent = {
    handleEvent: async () => {
      throw new Error('an event threw');
    },
  };

  test('a dead session sends the AuthBloc to auto sign-in, then goes to Hubs', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    const authAdds = jest.spyOn(authBloc, 'add');
    const hubs = jest.spyOn(mainAppBloc, 'add');

    mainAppBloc.add(failingEvent);
    await flush();

    expect(authAdds.mock.calls.map(c => c[0])[0]).toBeInstanceOf(
      AutoLoginEvent,
    );
    expect(hubs.mock.calls[1][0]).toBeInstanceOf(GoToHubsScreenEvent);
  });

  test('a live session only goes to Hubs', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.success());
    const authAdds = jest.spyOn(authBloc, 'add');
    const hubs = jest.spyOn(mainAppBloc, 'add');

    mainAppBloc.add(failingEvent);
    await flush();

    expect(authAdds).not.toHaveBeenCalled();
    expect(hubs.mock.calls[1][0]).toBeInstanceOf(GoToHubsScreenEvent);
  });
});
