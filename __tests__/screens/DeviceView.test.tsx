// A hub's page (device_view.dart; spec 10 §3): name, the blacklisted banner, the status glyph in
// its three states, the six buttons and which are enabled, "Last Updated", the ⋮ menu, Back and
// the back arrow to the Hubs list, and the pull that fetches the hub again from Node.

import React from 'react';
import * as Keychain from 'react-native-keychain';
import { BackHandler, Platform, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PageBackHandler,
  PopScope,
} from '../../src/components/layout/PopScope';
import { popMenu, PopupMenuHost } from '../../src/components/popups/PopupMenu';
import { PopupHost, popPopup } from '../../src/components/popups/popups';
import { parseDevice } from '../../src/models/device';
import { DeviceView } from '../../src/screens/devices/DeviceView';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import {
  DevicesBloc,
  GoToAboutDeviceScreen,
  GoToDeviceSettingsEvent,
  GoToDevicesHomeScreen,
  GoToEditDeviceScreen,
} from '../../src/state/devices/devicesBloc';
import { DevicesBlocProvider } from '../../src/state/devices/DevicesBlocContext';
import { RefreshState } from '../../src/state/genericBloc';
import type { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
import {
  kCartellBlue,
  kCartellDarkGray,
  kCartellLightGray,
  kCartellYellow,
} from '../../src/theme/colors';
import { installFakeServer } from '../helpers/fakeServer';
import { hubJson } from '../helpers/hubJson';

const backHandlers: (() => boolean | null | undefined)[] = [];
jest
  .spyOn(BackHandler, 'addEventListener')
  .mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return {
      remove: () => {
        backHandlers.splice(backHandlers.indexOf(handler as () => boolean), 1);
      },
    };
  });
jest
  .spyOn(View.prototype as never, 'measureInWindow' as never)
  .mockImplementation(((cb: (...a: number[]) => void) =>
    cb(312, 40, 48, 48)) as never);

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const devicesBloc = { add: jest.fn() };

let nextId = 3000;
/** A hub no other test has cached. */
const freshHub = (overrides: Parameters<typeof hubJson>[0] = {}) =>
  hubJson({ id: nextId++, ...overrides });

const sensor = {
  id: 900,
  sensor_id: 'A1',
  name: 'Driveway',
  longitude: null,
  latitude: null,
  has_low_battery: false,
  is_active: true,
  connection_date: '2026-10-21T07:00:00-05:00',
  disconnection_date: null,
  should_send_notification: true,
  fw_version: 3,
  sensor_type: 'EX',
  is_blacklisted: true,
};

async function show(
  json: ReturnType<typeof hubJson>,
  refresh: RefreshState = RefreshState.ready,
) {
  const device = parseDevice(json);
  await render(
    <GestureHandlerRootView>
      <SafeAreaProvider initialMetrics={metrics}>
        <PageBackHandler />
        <AuthBlocProvider bloc={{ add: jest.fn() } as unknown as AuthBloc}>
          <MainAppBlocProvider
            bloc={{ add: jest.fn() } as unknown as MainAppBloc}
          >
            <DevicesBlocProvider bloc={devicesBloc as unknown as DevicesBloc}>
              <PopupHost>
                {/* DevicesRouter's PopScope, which keeps Back on the page. */}
                <PopScope canPop={false}>
                  <DeviceView device={device} refresh={refresh} />
                </PopScope>
                <PopupMenuHost />
              </PopupHost>
            </DevicesBlocProvider>
          </MainAppBlocProvider>
        </AuthBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
  return device;
}

/** The clock, one 16 ms frame at a time (Reanimated's test runner needs the steps). */
async function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });
  }
}

/** The colour of a glyph (icons are hidden from screen readers, as in Flutter). */
const glyphColour = (codePoint: number) =>
  (
    screen.getByText(String.fromCodePoint(codePoint), {
      includeHiddenElements: true,
    }).props.style as { color: string }[]
  ).at(-1)!.color;

const TOWER = 0xf519;
const CHECK = 0xf00c;
const XMARK = 0xf00d;
const DOOR_OPEN = 0xf52b;
const RSS = 0xf09e;

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 5, 15, 42));
  devicesBloc.add.mockClear();
  resetUserPersistorForTests();
  persistUser({
    id: 1,
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    phoneNo: null,
    shouldSendEmails: false,
  });
});

afterEach(async () => {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      popPopup();
      popMenu();
    });
    await advance(400);
  }
  jest.useRealTimers();
});

test('the name, the status and "Last Updated" for a connected hub', async () => {
  await show(freshHub({ name: 'Gate', device: { is_connected: true } }));
  expect(screen.getByText('Gate')).toBeTruthy();
  expect(screen.getByText('Status: Connected')).toBeTruthy();
  expect(glyphColour(TOWER)).toBe(kCartellYellow);
  expect(glyphColour(CHECK)).toBe(kCartellYellow);
  expect(screen.getByText('Last Updated: 11-05-2026 03:42 PM')).toBeTruthy();
  expect(screen.queryByText(/flagged for suspicious activity/)).toBeNull();
});

test('a disconnected hub: a dark gray tower and ✗', async () => {
  await show(freshHub());
  expect(screen.getByText('Status: Disconnected')).toBeTruthy();
  expect(glyphColour(TOWER)).toBe(kCartellDarkGray);
  expect(glyphColour(XMARK)).toBe(kCartellDarkGray);
});

test('while checking: a light gray tower, no mark, "Checking..."', async () => {
  await show(
    freshHub({ device: { is_connected: true } }),
    RefreshState.checking,
  );
  expect(screen.getByText('Status: Checking...')).toBeTruthy();
  expect(glyphColour(TOWER)).toBe(kCartellLightGray);
  expect(
    screen.queryByText(String.fromCodePoint(CHECK), {
      includeHiddenElements: true,
    }),
  ).toBeNull();
});

test('after a failed re-check: last known', async () => {
  await show(freshHub({ device: { is_connected: true } }), RefreshState.failed);
  expect(screen.getByText('Status: Last known connected')).toBeTruthy();
});

test('a blacklisted hub shows the flagged banner (and its connection, not "Blacklisted")', async () => {
  await show(
    freshHub({ device: { is_blacklisted: true, is_connected: true } }),
  );
  expect(
    screen.getByText(
      'This hub has been flagged for suspicious activity. Please contact support to re-activate this hub',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Status: Connected')).toBeTruthy();
});

test('the six buttons; Open Gate needs integrator support and a connection, Connect HUB a disconnection', async () => {
  await show(freshHub({ device: { is_connected: true } }));
  for (const label of [
    'History',
    'Open Gate',
    'Sensors',
    'Firmware Updates',
    'Connect HUB',
    'Hub Settings',
  ]) {
    expect(screen.getByText(label)).toBeTruthy();
  }
  expect(glyphColour(DOOR_OPEN)).toBe(kCartellDarkGray);
  expect(glyphColour(RSS)).toBe(kCartellDarkGray);
});

test('an integrator hub that is connected enables Open Gate, which does nothing yet', async () => {
  await show(
    freshHub({
      should_use_emulated_sensor: true,
      device: { is_connected: true },
    }),
  );
  expect(glyphColour(DOOR_OPEN)).toBe(kCartellBlue);
  await fireEvent.press(screen.getByText('Open Gate'));
  await advance(500);
  expect(screen.queryByText('Sent message to open gate')).toBeNull();
  expect(devicesBloc.add).not.toHaveBeenCalled();
});

test('a disconnected hub enables Connect HUB, which does nothing yet', async () => {
  await show(freshHub());
  expect(glyphColour(RSS)).toBe(kCartellBlue);
  await fireEvent.press(screen.getByText('Connect HUB'));
  expect(devicesBloc.add).not.toHaveBeenCalled();
});

test('History, Sensors and Firmware Updates do nothing yet', async () => {
  await show(freshHub({ device: { sensors: [sensor] } }));
  for (const label of ['History', 'Sensors', 'Firmware Updates']) {
    await fireEvent.press(screen.getByText(label));
  }
  expect(devicesBloc.add).not.toHaveBeenCalled();
});

test('Hub Settings opens the hub settings', async () => {
  const device = await show(freshHub());
  await fireEvent.press(screen.getByText('Hub Settings'));
  expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  const event = devicesBloc.add.mock.calls[0][0];
  expect(event).toBeInstanceOf(GoToDeviceSettingsEvent);
  expect(event.device).toBe(device);
});

test('the back arrow goes to the Hubs list', async () => {
  await show(freshHub());
  await fireEvent.press(
    screen.getByText(String.fromCodePoint(0xf177), {
      includeHiddenElements: true,
    }),
  );
  expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  expect(devicesBloc.add.mock.calls[0][0]).toBeInstanceOf(
    GoToDevicesHomeScreen,
  );
});

test('Android Back goes to the Hubs list', async () => {
  await show(freshHub());
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler()) {
        return;
      }
    }
  });
  expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  expect(devicesBloc.add.mock.calls[0][0]).toBeInstanceOf(
    GoToDevicesHomeScreen,
  );
});

describe('the ⋮ menu', () => {
  const layout = (width: number, height: number) => ({
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
  const openMenu = async () => {
    await fireEvent.press(screen.getByLabelText('Show menu'));
    await fireEvent(
      screen.getByTestId('popup-menu-measure', { includeHiddenElements: true }),
      'layout',
      layout(200, 224),
    );
    await fireEvent(
      screen.getByTestId('popup-menu-content'),
      'layout',
      layout(224, 240),
    );
    await advance(400);
  };

  test('lists Rename Hub, About, Check for updates and Delete Hub', async () => {
    await show(freshHub());
    await openMenu();
    for (const label of [
      'Rename Hub',
      'About',
      'Check for updates',
      'Delete Hub',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  /** A session, and Node answering for one hub. */
  async function serve(
    json: ReturnType<typeof hubJson>,
    replies: Record<string, { status: number; body?: unknown }> = {},
  ) {
    AuthRequestManager.resetSingleFlightForTesting();
    keychain.clear();
    await SecureStorage.setAccessToken('A');
    await SecureStorage.setRefreshToken('R');
    return installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      [`GET /devices/${json.id}/`]: { status: 200, body: json },
      ...replies,
    });
  }

  const sent = (requests: { method: string; path: string }[]) =>
    requests
      .filter(r => r.path.startsWith('/devices/'))
      .map(r => `${r.method} ${r.path}`);

  test('Rename Hub closes the menu, opens the rename page and fetches the hub again', async () => {
    const json = freshHub();
    const { requests } = await serve(json);
    const device = await show(json);
    await openMenu();
    await fireEvent.press(screen.getByText('Rename Hub'));
    await advance(400);
    expect(screen.queryByText('Delete Hub')).toBeNull();
    expect(devicesBloc.add).toHaveBeenCalledTimes(1);
    const event = devicesBloc.add.mock.calls[0][0];
    expect(event).toBeInstanceOf(GoToEditDeviceScreen);
    expect(event.device).toBe(device);
    expect(sent(requests)).toEqual([`GET /devices/${json.id}/`]);
  });

  test('About closes the menu and opens About', async () => {
    const device = await show(freshHub());
    await openMenu();
    await fireEvent.press(screen.getByText('About'));
    await advance(400);
    expect(screen.queryByText('Delete Hub')).toBeNull();
    const event = devicesBloc.add.mock.calls[0][0];
    expect(event).toBeInstanceOf(GoToAboutDeviceScreen);
    expect(event.device).toBe(device);
  });

  test('Check for updates closes the menu and does nothing else yet', async () => {
    await show(freshHub());
    await openMenu();
    await fireEvent.press(screen.getByText('Check for updates'));
    await advance(400);
    expect(screen.queryByText('Delete Hub')).toBeNull();
    expect(devicesBloc.add).not.toHaveBeenCalled();
  });

  const DELETE_MESSAGE =
    'Are you sure you want to delete this Hub? Note: Any sensors paired to this hub will remain paired until manually deleted.';

  test('Delete Hub asks "Delete Hub?" over the menu; Cancel closes only the dialog', async () => {
    const json = freshHub();
    const { requests } = await serve(json);
    await show(json);
    await openMenu();
    await fireEvent.press(screen.getByText('Delete Hub'));
    await advance(400);
    expect(screen.getByText('Delete Hub?')).toBeTruthy();
    expect(screen.getByText(DELETE_MESSAGE)).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
    await fireEvent.press(screen.getByText('Cancel'));
    await advance(400);
    expect(screen.queryByText('Delete Hub?')).toBeNull();
    // The menu is still open behind it.
    expect(screen.getByText('Delete Hub')).toBeTruthy();
    expect(sent(requests)).toEqual([]);
    expect(devicesBloc.add).not.toHaveBeenCalled();
  });

  test('Delete deletes the hub on Node, closes the dialog and the menu, and goes to the Hubs list', async () => {
    const json = freshHub();
    const { requests } = await serve(json, {
      [`DELETE /devices/${json.id}/`]: { status: 204, body: '' },
    });
    await show(json);
    await openMenu();
    await fireEvent.press(screen.getByText('Delete Hub'));
    await advance(400);
    await fireEvent.press(screen.getByText('Delete'));
    await advance(400);
    expect(sent(requests)).toEqual([`DELETE /devices/${json.id}/`]);
    expect(screen.queryByText('Delete Hub?')).toBeNull();
    expect(screen.queryByText('Delete Hub')).toBeNull();
    expect(devicesBloc.add).toHaveBeenCalledTimes(1);
    expect(devicesBloc.add.mock.calls[0][0]).toBeInstanceOf(
      GoToDevicesHomeScreen,
    );
  });

  test('a failed delete shows nothing and leaves the dialog up', async () => {
    const json = freshHub();
    await serve(json, {
      [`DELETE /devices/${json.id}/`]: { status: 500, body: '' },
    });
    await show(json);
    await openMenu();
    await fireEvent.press(screen.getByText('Delete Hub'));
    await advance(400);
    await fireEvent.press(screen.getByText('Delete'));
    await advance(400);
    expect(screen.getByText('Delete Hub?')).toBeTruthy();
    expect(devicesBloc.add).not.toHaveBeenCalled();
  });
});

test('pulling the page down fetches the hub from Node again and moves "Last Updated" on', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  AuthRequestManager.resetSingleFlightForTesting();
  keychain.clear();
  await SecureStorage.setAccessToken('A');
  await SecureStorage.setRefreshToken('R');
  const json = freshHub({ name: 'Gate' });
  const { requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    [`GET /devices/${json.id}/`]: {
      status: 200,
      body: { ...json, name: 'Front Gate' },
    },
  });
  await show(json);
  // Always pullable: a page that fits on the screen is pulled all the same.
  const page = screen.getByTestId('hub-page');
  await fireEvent(page, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 600 } },
  });
  await fireEvent(page, 'contentSizeChange', 360, 500);
  jest.setSystemTime(new Date(2026, 10, 5, 15, 50));
  await act(async () => {
    fireGestureHandler(getByGestureTestId('liquid-pull-to-refresh'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 8 },
      { state: State.ACTIVE, translationY: 220 },
      { state: State.END, translationY: 220 },
    ]);
  });
  await advance(3200);

  expect(requests.map(r => `${r.method} ${r.path}`)).toContain(
    `GET /devices/${json.id}/`,
  );
  expect(requests.some(r => r.path.includes('get_health'))).toBe(false);
  expect(screen.getByText('Front Gate')).toBeTruthy();
  expect(screen.getByText(/^Last Updated: 11-05-2026 03:5\d PM$/)).toBeTruthy();
});
