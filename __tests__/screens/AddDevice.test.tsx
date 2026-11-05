// Add Hub (add_device_screen.dart and its bloc) and "Hub Added to Account!"
// (successfully_added_device_screen.dart): the page, manual MAC entry, the scanner, Submit's
// registration on Node and its outcomes, and the ways back.

import React from 'react';
import * as Keychain from 'react-native-keychain';
import { BackHandler, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PageRouteBase,
  PageRouteHost,
  resetPagesForTests,
} from '../../src/components/layout/PageRoute';
import {
  PageBackHandler,
  PopScope,
} from '../../src/components/layout/PopScope';
import {
  PopupHost,
  resetPopupsForTests,
} from '../../src/components/popups/popups';
import { parseDevice } from '../../src/models/device';
import { AddDevice } from '../../src/screens/devices/addDevice/AddDevice';
import { resetAddDeviceErrForTests } from '../../src/screens/devices/addDevice/addDeviceBloc';
import { SuccessfullyAddedDeviceScreen } from '../../src/screens/devices/addDevice/SuccessfullyAddedDeviceScreen';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import { hashMacAddress } from '../../src/services/hashMacAddress';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import {
  DevicesBloc,
  GoToAddHubSuccessScreen,
  GoToDevicesHomeScreen,
  GoToSpecificDeviceEvent,
} from '../../src/state/devices/devicesBloc';
import { DevicesBlocProvider } from '../../src/state/devices/DevicesBlocContext';
import type { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
import { installFakeServer } from '../helpers/fakeServer';
import { hubJson } from '../helpers/hubJson';
import { cameraMock } from '../helpers/visionCameraMock';

const backHandlers: (() => boolean | null | undefined)[] = [];

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const devicesBloc = { add: jest.fn() };

const LOCATION_ID = 12;
const profile = {
  user: 1,
  should_send_notification: true,
  locations: [{ id: LOCATION_ID, name: 'Home', devices: [] }],
  alexa_enabled: false,
};
const TAKEN =
  'Mac address is not available. Device may already be archived or may not exist in system. Check that it is correct, and if it is, call support.';

type Reply = { status: number; body?: unknown };

function serve(register: Reply, extra: Record<string, Reply> = {}) {
  return installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /profiles/me': { status: 200, body: profile },
    [`POST /locations/${LOCATION_ID}/devices/`]: register,
    ...extra,
  });
}

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
                <PageRouteBase>
                  {/* DevicesRouter's PopScope, which keeps Back on the page. */}
                  <PopScope canPop={false}>{page}</PopScope>
                </PageRouteBase>
                <PageRouteHost />
              </PopupHost>
            </DevicesBlocProvider>
          </MainAppBlocProvider>
        </AuthBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
  await settle();
}

async function settle(ms = 600) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
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

/** Types into a field one character at a time, as a keyboard does. */
async function typeInto(testID: string, chars: string) {
  for (const c of chars) {
    const input = screen.getByTestId(testID);
    await fireEvent.changeText(input, `${input.props.value}${c}`);
  }
}

const events = () => devicesBloc.add.mock.calls.map(call => call[0]);

async function enterManually(name: string, mac: string) {
  await fireEvent.press(screen.getByText('Tap to Add Mac Address Manually'));
  await fireEvent.changeText(screen.getByTestId('hubName'), name);
  await typeInto('macAddress', mac);
}

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  devicesBloc.add.mockClear();
  cameraMock.reset();
  resetPagesForTests();
  resetPopupsForTests();
  resetAddDeviceErrForTests();
  backHandlers.length = 0;
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      backHandlers.push(handler as () => boolean);
      return {
        remove: () => {
          backHandlers.splice(
            backHandlers.indexOf(handler as () => boolean),
            1,
          );
        },
      };
    });
  jest
    .spyOn(View.prototype as never, 'measureInWindow' as never)
    .mockImplementation(((cb: (...a: number[]) => void) =>
      cb(312, 40, 48, 48)) as never);
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

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Add Hub', () => {
  test('the page as it opens, and the profile fetched for its location', async () => {
    const { requests } = serve({ status: 201 });
    await show(<AddDevice />);
    expect(screen.getByText('Enter Hub Information')).toBeTruthy();
    expect(screen.getByText('Tap To Scan QR Code')).toBeTruthy();
    expect(screen.getByTestId('hubName')).toBeTruthy();
    expect(screen.queryByTestId('macAddress')).toBeNull();
    expect(screen.getByText('Submit')).toBeTruthy();
    expect(screen.getByText('Tap to Add Mac Address Manually')).toBeTruthy();
    expect(requests.map(r => `${r.method} ${r.path}`)).toContain(
      'GET /profiles/me',
    );
  });

  test('manual entry shows the MAC field, editable, and hides the link', async () => {
    serve({ status: 201 });
    await show(<AddDevice />);
    await fireEvent.press(screen.getByText('Tap to Add Mac Address Manually'));
    expect(screen.getByTestId('macAddress').props.editable).toBe(true);
    expect(screen.queryByText('Tap to Add Mac Address Manually')).toBeNull();
  });

  test('the MAC field upper-cases and masks what is typed', async () => {
    serve({ status: 201 });
    await show(<AddDevice />);
    await enterManually('Gate', 'ff:ff:ff:fd:00:06zz');
    expect(screen.getByTestId('macAddress').props.value).toBe(
      'FF:FF:FF:FD:00:06',
    );
  });

  test('Submit is disabled until both fields have text', async () => {
    const { requests } = serve({ status: 201 });
    await show(<AddDevice />);
    await fireEvent.changeText(screen.getByTestId('hubName'), 'Gate');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(requests.some(r => r.path.startsWith('/locations/'))).toBe(false);
  });

  test('Submit registers the hub on Node with the hashed lowercase MAC, then shows success', async () => {
    const json = hubJson({ id: 88, name: 'Gate' });
    const { requests } = serve(
      { status: 201, body: { name: 'Gate', id: 88, mac_address: 'x' } },
      { 'GET /devices/88/': { status: 200, body: json } },
    );
    await show(<AddDevice />);
    await enterManually('Gate', 'fffffffd0006');
    await fireEvent.press(screen.getByText('Submit'));
    // The loader replaces the button while it runs.
    expect(screen.getByTestId('rounded-loader')).toBeTruthy();
    await settle();
    const post = requests.find(r => r.path.startsWith('/locations/'));
    expect(post?.path).toBe(`/locations/${LOCATION_ID}/devices/`);
    expect(post?.body).toBe(
      `name=Gate&mac_address=${hashMacAddress('ff:ff:ff:fd:00:06')}`,
    );
    expect(requests.map(r => `${r.method} ${r.path}`)).toContain(
      'GET /devices/88/',
    );
    const [event] = events();
    expect(event).toBeInstanceOf(GoToAddHubSuccessScreen);
    expect(event.device.id).toBe(88);
  });

  test('a refused MAC: "Adding Hub Failed" with the server\'s message, and the button back', async () => {
    serve({ status: 400, body: { non_field_errors: [TAKEN] } });
    await show(<AddDevice />);
    await enterManually('Gate', 'aabbccddeeff');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(screen.getByText('Adding Hub Failed')).toBeTruthy();
    // Each message on its own line, after a space and a line break.
    expect(screen.getByText(` \n${TAKEN}`)).toBeTruthy();
    expect(screen.queryByTestId('rounded-loader')).toBeNull();
    expect(events()).toEqual([]);
  });

  test('the message stays for a later failure that brings none (static err)', async () => {
    serve({ status: 400, body: { non_field_errors: [TAKEN] } });
    await show(<AddDevice />);
    await enterManually('Gate', 'aabbccddeeff');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    await fireEvent.press(screen.getByText('Okay'));
    await settle();
    serve({ status: 400, body: { name: ['This field may not be blank.'] } });
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(screen.getByText(` \n${TAKEN}`)).toBeTruthy();
  });

  test('a first failure with no message says "An Error occurred. Please try again."', async () => {
    serve({ status: 400, body: { name: ['x'] } });
    await show(<AddDevice />);
    await enterManually('Gate', 'aabbccddeeff');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(
      screen.getByText('An Error occurred. Please try again.'),
    ).toBeTruthy();
  });

  test('a server error says "Failed to add hub…"', async () => {
    serve({ status: 500, body: 'oops' });
    await show(<AddDevice />);
    await enterManually('Gate', 'aabbccddeeff');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(
      screen.getByText(
        'Failed to add hub. Please try again. If the problem persists, please contact support.',
      ),
    ).toBeTruthy();
  });

  test('a 4xx whose body is a list leaves the loader up and shows nothing (as Flutter)', async () => {
    serve({
      status: 400,
      body: ['You do not have access to this location or group.'],
    });
    await show(<AddDevice />);
    await enterManually('Gate', 'aabbccddeeff');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(screen.getByTestId('rounded-loader')).toBeTruthy();
    expect(screen.queryByText('Adding Hub Failed')).toBeNull();
  });

  test('Hub Name says it cannot be empty once focused and emptied', async () => {
    serve({ status: 201 });
    await show(<AddDevice />);
    const input = screen.getByTestId('hubName');
    await fireEvent.changeText(input, 'G');
    expect(screen.queryByText('Device name cannot be empty.')).toBeNull();
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, '');
    expect(screen.getByText('Device name cannot be empty.')).toBeTruthy();
  });

  test('scanning: asks for the camera, a hub code fills the MAC, which is then locked', async () => {
    serve({ status: 201 });
    await show(<AddDevice />);
    await fireEvent.press(screen.getByTestId('scan-qr-tile'));
    await settle();
    expect(screen.getByText('Scan Hub QR Code')).toBeTruthy();
    expect(cameraMock.requests).toBe(1);
    await act(async () => {
      cameraMock.scan('ff:ff:ff:fd:00:06');
    });
    await settle();
    expect(screen.queryByText('Scan Hub QR Code')).toBeNull();
    const mac = screen.getByTestId('macAddress');
    // Shown as scanned: the formatter does not run on text set in code.
    expect(mac.props.value).toBe('ff:ff:ff:fd:00:06');
    expect(mac.props.editable).toBe(false);
    expect(screen.queryByText('Tap to Add Mac Address Manually')).toBeNull();
  });

  test('tapping a scanned MAC asks first; Okay unlocks it', async () => {
    serve({ status: 201 });
    await show(<AddDevice />);
    await fireEvent.press(screen.getByTestId('scan-qr-tile'));
    await settle();
    await act(async () => {
      cameraMock.scan('ff:ff:ff:fd:00:06');
    });
    await settle();
    await fireEvent.press(screen.getByTestId('mac-field-tap'));
    await settle();
    expect(screen.getByText('Change Mac Address')).toBeTruthy();
    expect(
      screen.getByText(
        "The Mac Address of your hub has already been scanned. Are you sure you'd like to change it?",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Okay'));
    await settle();
    expect(screen.queryByText('Change Mac Address')).toBeNull();
    expect(screen.getByTestId('macAddress').props.editable).toBe(true);
  });

  test('Submit after unlocking asks "Change Mac Address" again (it re-sends the last event)', async () => {
    const json = hubJson({ id: 90 });
    serve(
      { status: 201, body: { id: 90 } },
      { 'GET /devices/90/': { status: 200, body: json } },
    );
    await show(<AddDevice />);
    await fireEvent.press(screen.getByTestId('scan-qr-tile'));
    await settle();
    await act(async () => {
      cameraMock.scan('ff:ff:ff:fd:00:06');
    });
    await settle();
    await fireEvent.press(screen.getByTestId('mac-field-tap'));
    await settle();
    await fireEvent.press(screen.getByText('Okay'));
    await settle();
    await fireEvent.changeText(screen.getByTestId('hubName'), 'Gate');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(screen.getByText('Change Mac Address')).toBeTruthy();
    expect(events()[0]).toBeInstanceOf(GoToAddHubSuccessScreen);
  });

  test.each([
    ['the ← on the page', 'arrow'],
    ['Android Back', 'back'],
  ])('%s goes back to the Hubs list', async (_label, how) => {
    serve({ status: 201 });
    await show(<AddDevice />);
    if (how === 'arrow') {
      await fireEvent.press(
        screen.getByText(String.fromCodePoint(0xf177), {
          includeHiddenElements: true,
        }),
      );
    } else {
      await pressBack();
    }
    expect(events()).toHaveLength(1);
    expect(events()[0]).toBeInstanceOf(GoToDevicesHomeScreen);
  });

  test('a failed profile fetch shows nothing; Submit then posts to location "null"', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /profiles/me': { status: 500 },
    });
    await show(<AddDevice />);
    expect(screen.getByText('Enter Hub Information')).toBeTruthy();
    await enterManually('Gate', 'aabbccddeeff');
    await fireEvent.press(screen.getByText('Submit'));
    await settle();
    expect(requests.find(r => r.path.startsWith('/locations/'))?.path).toBe(
      '/locations/null/devices/',
    );
  });
});

describe('Hub Added to Account!', () => {
  test('the texts and both buttons', async () => {
    const device = parseDevice(hubJson({ id: 91 }));
    await show(<SuccessfullyAddedDeviceScreen device={device} />);
    expect(screen.getByText('Hub Added to Account!')).toBeTruthy();
    expect(
      screen.getByText('Your hub is now added to your account.'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Next, we will pair the hub to your Wi-Fi. Are you ready to proceed?',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Proceed and Pair To Wi-Fi')).toBeTruthy();
    expect(screen.getByText('Pair to Wi-Fi Later')).toBeTruthy();
  });

  test('Pair to Wi-Fi Later and Back open the new hub; Proceed does nothing yet', async () => {
    const device = parseDevice(hubJson({ id: 92 }));
    await show(<SuccessfullyAddedDeviceScreen device={device} />);
    await fireEvent.press(screen.getByText('Proceed and Pair To Wi-Fi'));
    expect(events()).toEqual([]);
    await fireEvent.press(screen.getByText('Pair to Wi-Fi Later'));
    await pressBack();
    expect(events()).toHaveLength(2);
    for (const event of events()) {
      expect(event).toBeInstanceOf(GoToSpecificDeviceEvent);
      expect(event.device).toBe(device);
    }
  });
});
