// Hub settings (device_settings_screen.dart; spec 10 §6): the five switches showing the hub's
// fields, the four that save on Node (with Flutter's toasts, including the integrator's
// copy-paste failure text), the onboard switch (bounces back with "Hub is not connected…" on a
// disconnected hub; saves on Node on a connected one), Pair Integrator, the
// switches writing into the cached hub, and the ways back to the hub's page.

import React from 'react';
import * as Keychain from 'react-native-keychain';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PageBackHandler,
  PopScope,
} from '../../src/components/layout/PopScope';
import { PopupHost } from '../../src/components/popups/popups';
import { ToastHost } from '../../src/components/popups/toasts';
import { Device, parseDevice } from '../../src/models/device';
import { DeviceSettingsScreen } from '../../src/screens/devices/DeviceSettingsScreen';
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
  GoToSpecificDeviceEvent,
} from '../../src/state/devices/devicesBloc';
import { DevicesBlocProvider } from '../../src/state/devices/DevicesBlocContext';
import { RefreshState } from '../../src/state/genericBloc';
import type { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
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

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const devicesBloc = { add: jest.fn() };

let nextId = 7000;
const freshHub = (overrides: Parameters<typeof hubJson>[0] = {}) =>
  hubJson({ id: nextId++, ...overrides });

/** The switches, top to bottom. */
const SWITCHES = [
  'onboard',
  'integrator',
  'notifications',
  'connection',
  'email',
] as const;
type SwitchName = (typeof SWITCHES)[number];

let requests: { method: string; path: string; body: string | undefined }[];

/** Signs in, has Node answer PATCH /devices/{id}/ with `status`, and shows the page. */
async function show(
  json: ReturnType<typeof hubJson>,
  { status = 200, refresh = RefreshState.ready } = {},
) {
  AuthRequestManager.resetSingleFlightForTesting();
  keychain.clear();
  await SecureStorage.setAccessToken('A');
  await SecureStorage.setRefreshToken('R');
  ({ requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    [`PATCH /devices/${json.id}/`]: { status, body: json },
  }));
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
              <ToastHost>
                <PopupHost>
                  <PopScope canPop={false}>
                    <DeviceSettingsScreen device={device} refresh={refresh} />
                  </PopScope>
                </PopupHost>
              </ToastHost>
            </DevicesBlocProvider>
          </MainAppBlocProvider>
        </AuthBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
  return device;
}

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(500);
  });
}

const switchState = (name: SwitchName): boolean =>
  screen.getAllByRole('switch')[SWITCHES.indexOf(name)].props.accessibilityState
    .checked;

/** A quick tap on a switch (the Switch is a PanResponder, which ignores fireEvent.press). */
async function tapSwitch(name: SwitchName) {
  const handlers = screen.getAllByRole('switch')[SWITCHES.indexOf(name)]
    .props as {
    onResponderGrant: (e: unknown) => void;
    onResponderRelease: (e: unknown) => void;
  };
  const touch = {
    touchActive: true,
    startPageX: 0,
    startPageY: 0,
    startTimeStamp: 1,
    currentPageX: 0,
    currentPageY: 0,
    currentTimeStamp: 1,
    previousPageX: 0,
    previousPageY: 0,
    previousTimeStamp: 1,
  };
  const event = {
    nativeEvent: { pageX: 0, pageY: 0, timestamp: 1 },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
      touchBank: [touch],
    },
  };
  await act(async () => {
    handlers.onResponderGrant(event);
    handlers.onResponderRelease(event);
  });
  await settle();
}

/** The cached hub's field behind a switch. */
const fieldOf = (device: Device, name: SwitchName): boolean =>
  ({
    onboard: device.shouldUseOnboardSensor,
    integrator: device.shouldUseEmulatedSensor,
    notifications: device.shouldSendNotification,
    connection: device.shouldSendConnectionNotification,
    email: device.shouldSendEmail,
  }[name]);

const patches = () =>
  requests.filter(r => r.method === 'PATCH').map(r => r.body);

function expectBackToHub(device: Device) {
  expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  const event = devicesBloc.add.mock.calls[0][0];
  expect(event).toBeInstanceOf(GoToSpecificDeviceEvent);
  expect(event.device).toBe(device);
}

beforeEach(() => {
  jest.useFakeTimers();
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
  await act(async () => {
    await jest.advanceTimersByTimeAsync(10000);
  });
  jest.useRealTimers();
});

test('the name, the status, the five labels and the switches showing the hub', async () => {
  await show(
    freshHub({
      name: 'Gate',
      should_use_onboard_sensor: false,
      should_use_emulated_sensor: false,
      should_send_notification: true,
      should_send_connection_notification: false,
      should_send_email: true,
      device: { is_connected: true },
    }),
  );
  expect(screen.getByText('Gate')).toBeTruthy();
  expect(screen.getByText('Status: Connected')).toBeTruthy();
  for (const label of [
    'Enable Onboard Sensor:',
    'Enable Integrator Support:',
    'Receive Hub Notifications:',
    'Receive Connection Notifications:',
    'Receive Email Notifications:',
  ]) {
    expect(screen.getByText(label)).toBeTruthy();
  }
  expect(SWITCHES.map(switchState)).toEqual([false, false, true, false, true]);
  expect(screen.queryByText('Pair Integrator')).toBeNull();
});

test('while checking, the status says so', async () => {
  await show(freshHub(), { refresh: RefreshState.checking });
  expect(screen.getByText('Status: Checking...')).toBeTruthy();
});

test.each<[SwitchName, string, string]>([
  ['notifications', 'should_send_notification', 'Notifications turned off.'],
  [
    'connection',
    'should_send_connection_notification',
    'Notifications turned on.',
  ],
  ['email', 'should_send_email', 'Email notifications turned off.'],
  ['integrator', 'should_use_emulated_sensor', 'Integrator support turned on.'],
])(
  'the %s switch saves on Node, toasts, and writes into the cached hub',
  async (name, field, toast) => {
    const device = await show(freshHub());
    const before = switchState(name);
    await tapSwitch(name);
    expect(patches()).toEqual([`${field}=${String(!before)}`]);
    expect(switchState(name)).toBe(!before);
    expect(screen.getByText(toast)).toBeTruthy();
    expect(fieldOf(device, name)).toBe(!before);
  },
);

test.each<[SwitchName, string]>([
  ['notifications', 'Notifications failed to turn off.'],
  ['connection', 'Notifications failed to turn on.'],
  ['email', 'Email notifications failed to turn off.'],
  // Flutter's copy-paste slip, kept.
  ['integrator', 'Email notifications failed to turn on.'],
])(
  'a failed save flips the %s switch back and says so',
  async (name, toast) => {
    const device = await show(freshHub(), { status: 500 });
    const before = switchState(name);
    await tapSwitch(name);
    expect(switchState(name)).toBe(before);
    expect(screen.getByText(toast)).toBeTruthy();
    // Flipped back on the cached hub too.
    expect(fieldOf(device, name)).toBe(before);
  },
);

test('Integrator Support shows Pair Integrator while on, which does nothing yet', async () => {
  await show(freshHub({ should_use_emulated_sensor: true }));
  expect(screen.getByText('Pair Integrator')).toBeTruthy();
  await fireEvent.press(screen.getByText('Pair Integrator'));
  await settle();
  expect(screen.queryByText('Sent pairing message successfully')).toBeNull();
  expect(requests.some(r => r.path.includes('pair_to_integrator'))).toBe(false);
  // Turned off, the button goes.
  await tapSwitch('integrator');
  expect(screen.queryByText('Pair Integrator')).toBeNull();
});

test('the onboard switch on a disconnected hub bounces back: "Hub is not connected…"', async () => {
  await show(freshHub({ should_use_onboard_sensor: false }));
  await tapSwitch('onboard');
  expect(switchState('onboard')).toBe(false);
  expect(
    screen.getByText('Hub is not connected. Please connect hub and try again.'),
  ).toBeTruthy();
  expect(patches()).toEqual([]);
});

test('the onboard switch on a connected hub saves on Node and toasts', async () => {
  const device = await show(
    freshHub({
      should_use_onboard_sensor: false,
      device: { is_connected: true },
    }),
  );
  await tapSwitch('onboard');
  expect(switchState('onboard')).toBe(true);
  expect(device.shouldUseOnboardSensor).toBe(true);
  expect(patches()).toEqual(['should_use_onboard_sensor=true']);
  expect(screen.getByText('Onboard sensor turned on.')).toBeTruthy();
});

test('a failed onboard save flips back and names the error and the state it stays in', async () => {
  const device = await show(
    freshHub({
      should_use_onboard_sensor: false,
      device: { is_connected: true },
    }),
    { status: 500 },
  );
  await tapSwitch('onboard');
  expect(switchState('onboard')).toBe(false);
  expect(device.shouldUseOnboardSensor).toBe(false);
  expect(
    screen.getByText(
      'Error encountered of type: NoHubInformationAvailableException. Onboard sensor turned off. Please try again soon.',
    ),
  ).toBeTruthy();
});

test('a change to the cached hub elsewhere moves its switch', async () => {
  const json = freshHub({ should_send_email: true });
  await show(json);
  await act(async () => {
    parseDevice({ ...json, should_send_email: false });
  });
  expect(switchState('email')).toBe(false);
});

test.each([0, 1])('the ✗ and the ← (%i) go back to the hub', async index => {
  const device = await show(freshHub());
  const buttons = [
    screen.getAllByText(String.fromCodePoint(0xf00d), {
      includeHiddenElements: true,
    })[0],
    screen.getByText(String.fromCodePoint(0xf177), {
      includeHiddenElements: true,
    }),
  ];
  await fireEvent.press(buttons[index]);
  expectBackToHub(device);
});

test('Android Back goes back to the hub', async () => {
  const device = await show(freshHub());
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler()) {
        return;
      }
    }
  });
  expectBackToHub(device);
});
