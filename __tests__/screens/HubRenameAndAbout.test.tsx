// Rename Hub (edit_device.dart; spec 10 §4) and the hub's About page (device_meta.dart; spec 10
// §5): what each shows, Submit sending the name to Node and going back to the hub only once that
// succeeded, and the ways back to the hub's page.

import React from 'react';
import * as Keychain from 'react-native-keychain';
import { BackHandler, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PageBackHandler,
  PopScope,
} from '../../src/components/layout/PopScope';
import { PopupHost } from '../../src/components/popups/popups';
import { Device, parseDevice } from '../../src/models/device';
import { DeviceMeta } from '../../src/screens/devices/DeviceMeta';
import { EditDevice } from '../../src/screens/devices/EditDevice';
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

let nextId = 5000;
const freshHub = (overrides: Parameters<typeof hubJson>[0] = {}) =>
  hubJson({ id: nextId++, ...overrides });

async function show(page: React.ReactElement) {
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
                <PopScope canPop={false}>{page}</PopScope>
              </PopupHost>
            </DevicesBlocProvider>
          </MainAppBlocProvider>
        </AuthBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
}

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(500);
  });
}

async function pressBack() {
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler()) {
        return;
      }
    }
  });
}

/** The ✗ in the app bar and the ← on the page, in that order (icons are hidden from readers). */
const closeButtons = () => [
  // A disconnected hub's status mark on About is the same glyph; the app bar's comes first.
  screen.getAllByText(String.fromCodePoint(0xf00d), {
    includeHiddenElements: true,
  })[0],
  screen.getByText(String.fromCodePoint(0xf177), {
    includeHiddenElements: true,
  }),
];

/** The one event added, which must take the user back to this hub's page. */
function expectBackToHub(device: Device) {
  expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  const event = devicesBloc.add.mock.calls[0][0];
  expect(event).toBeInstanceOf(GoToSpecificDeviceEvent);
  expect(event.device).toBe(device);
}

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
  AuthRequestManager.resetSingleFlightForTesting();
  keychain.clear();
  await SecureStorage.setAccessToken('A');
  await SecureStorage.setRefreshToken('R');
});

afterEach(() => jest.useRealTimers());

describe('Rename Hub', () => {
  function serve(id: number, reply: { status: number; body?: unknown }) {
    return installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      [`PATCH /devices/${id}/`]: reply,
    });
  }

  test('shows the header, the prompt, the field with the hub name, and Submit', async () => {
    const device = parseDevice(freshHub({ name: 'Gate' }));
    await show(<EditDevice device={device} />);
    // The rename page's header says Hub Settings, as in Flutter.
    expect(screen.getByText('Hub Settings')).toBeTruthy();
    expect(screen.getByText('Enter Your Hub Name.')).toBeTruthy();
    expect(screen.getByTestId('hubName').props.value).toBe('Gate');
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  test('Submit sends the name to Node, then goes back to the hub', async () => {
    const json = freshHub({ name: 'Gate' });
    const { requests } = serve(json.id as number, { status: 200, body: json });
    const device = parseDevice(json);
    await show(<EditDevice device={device} />);
    await fireEvent.changeText(screen.getByTestId('hubName'), 'Front Gate');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    const patches = requests.filter(r => r.method === 'PATCH');
    expect(patches.map(r => [r.path, r.body])).toEqual([
      [`/devices/${json.id}/`, 'name=Front+Gate'],
    ]);
    expectBackToHub(device);
  });

  test('a rejected name shows nothing and stays on the page', async () => {
    const json = freshHub();
    serve(json.id as number, { status: 400, body: { name: ['blank'] } });
    await show(<EditDevice device={parseDevice(json)} />);
    await fireEvent.changeText(screen.getByTestId('hubName'), '');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(devicesBloc.add).not.toHaveBeenCalled();
    expect(screen.getByText('Enter Your Hub Name.')).toBeTruthy();
  });

  test.each([0, 1])(
    'the ✗ and the ← (%i) go back to the hub without saving',
    async index => {
      const json = freshHub();
      const { requests } = serve(json.id as number, { status: 200 });
      const device = parseDevice(json);
      await show(<EditDevice device={device} />);
      await fireEvent.changeText(screen.getByTestId('hubName'), 'Unsaved');
      await fireEvent.press(closeButtons()[index]);
      expectBackToHub(device);
      expect(requests.some(r => r.method === 'PATCH')).toBe(false);
    },
  );

  test('Android Back goes back to the hub', async () => {
    const device = parseDevice(freshHub());
    await show(<EditDevice device={device} />);
    await pressBack();
    expectBackToHub(device);
  });
});

describe('About', () => {
  test('the name, the status and the three rows', async () => {
    const device = parseDevice(
      freshHub({
        name: 'Gate',
        device: {
          is_connected: true,
          mac_address: 'ff:ff:ff:fd:00:01',
          esp32_app_version: 1025,
          rfm6601_app_version: 7,
        },
      }),
    );
    await show(<DeviceMeta device={device} />);
    expect(screen.getByText('Gate')).toBeTruthy();
    expect(screen.getByText('Status: Connected')).toBeTruthy();
    expect(screen.getByText('Mac Address')).toBeTruthy();
    expect(screen.getByText('ff:ff:ff:fd:00:01')).toBeTruthy();
    expect(screen.getByText('Controller Firmware Version')).toBeTruthy();
    expect(screen.getByText('1025')).toBeTruthy();
    expect(screen.getByText('Transmitter Firmware Version')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Last Updated: ')).toBeTruthy();
    expect(screen.getByText('11-05-2026 03:42 PM')).toBeTruthy();
  });

  test('while checking, the status says so', async () => {
    const device = parseDevice(freshHub());
    await show(<DeviceMeta device={device} refresh={RefreshState.checking} />);
    expect(screen.getByText('Status: Checking...')).toBeTruthy();
  });

  test('a version the server left out reads "null"', async () => {
    const device = parseDevice(
      freshHub({ device: { esp32_app_version: null } }),
    );
    await show(<DeviceMeta device={device} />);
    expect(screen.getByText('null')).toBeTruthy();
  });

  test('"Last Updated" is the time of the latest build', async () => {
    const device = parseDevice(freshHub());
    await show(<DeviceMeta device={device} refresh={RefreshState.checking} />);
    jest.setSystemTime(new Date(2026, 10, 5, 15, 47));
    await screen.rerender(
      <GestureHandlerRootView>
        <SafeAreaProvider initialMetrics={metrics}>
          <AuthBlocProvider bloc={{ add: jest.fn() } as unknown as AuthBloc}>
            <MainAppBlocProvider
              bloc={{ add: jest.fn() } as unknown as MainAppBloc}
            >
              <DevicesBlocProvider bloc={devicesBloc as unknown as DevicesBloc}>
                <PopupHost>
                  <PopScope canPop={false}>
                    <DeviceMeta device={device} refresh={RefreshState.ready} />
                  </PopScope>
                </PopupHost>
              </DevicesBlocProvider>
            </MainAppBlocProvider>
          </AuthBlocProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>,
    );
    expect(screen.getByText('11-05-2026 03:47 PM')).toBeTruthy();
  });

  test.each([0, 1])('the ✗ and the ← (%i) go back to the hub', async index => {
    const device = parseDevice(freshHub());
    await show(<DeviceMeta device={device} />);
    await fireEvent.press(closeButtons()[index]);
    expectBackToHub(device);
  });

  test('Android Back goes back to the hub', async () => {
    const device = parseDevice(freshHub());
    await show(<DeviceMeta device={device} />);
    await pressBack();
    expectBackToHub(device);
  });
});
