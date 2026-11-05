// The Hubs screen with hubs (devices_screen.dart; spec 10 §2): one card per hub with its name, the
// hub picture or the blacklisted warning, and the status line; a re-fetched hub redraws its card;
// tapping a card opens that hub; pulling the list down refreshes the hubs, once the list is taller
// than the screen (a short one cannot be pulled, as in Flutter).

import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PopupHost } from '../../src/components/popups/popups';
import { parseDevice } from '../../src/models/device';
import { DevicesScreen } from '../../src/screens/devices/DevicesScreen';
import { persistUser } from '../../src/services/data/userPersistor';
import { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import type { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
import {
  DevicesBloc,
  GoToSpecificDeviceEvent,
  RefreshDevices,
} from '../../src/state/devices/devicesBloc';
import { DevicesBlocProvider } from '../../src/state/devices/DevicesBlocContext';
import { kCartellDarkGray, kCartellYellow } from '../../src/theme/colors';
import { hubJson } from '../helpers/hubJson';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const sensor = {
  id: 500,
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

const gate = hubJson({ id: 201, name: 'Gate', device: { is_connected: true } });
const barn = hubJson({
  id: 202,
  name: 'Barn',
  device: { id: 32, sensors: [sensor] },
});
const shed = hubJson({
  id: 203,
  name: 'Shed',
  device: { id: 33, is_blacklisted: true, is_connected: true },
});

const devicesBloc = { add: jest.fn() };

async function show() {
  persistUser({
    id: 1,
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    phoneNo: null,
    shouldSendEmails: false,
  });
  const devices = [gate, barn, shed].map(parseDevice);
  await render(
    <GestureHandlerRootView>
      <SafeAreaProvider initialMetrics={metrics}>
        <AuthBlocProvider bloc={{ add: jest.fn() } as unknown as AuthBloc}>
          <MainAppBlocProvider
            bloc={{ add: jest.fn() } as unknown as MainAppBloc}
          >
            <DevicesBlocProvider bloc={devicesBloc as unknown as DevicesBloc}>
              <PopupHost>
                <DevicesScreen devices={devices} />
              </PopupHost>
            </DevicesBlocProvider>
          </MainAppBlocProvider>
        </AuthBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
  return devices;
}

/** The colour of the tower glyph next to a status line. */
const towerColours = () =>
  screen
    .getAllByText(String.fromCodePoint(0xf519), { includeHiddenElements: true })
    .map(glyph => (glyph.props.style as { color: string }[]).at(-1)!.color);

test('one card per hub, in order, with no empty card', async () => {
  await show();
  expect(screen.queryByText('No Hubs have been added.')).toBeNull();
  expect(screen.getByText('Gate')).toBeTruthy();
  expect(screen.getByText('Barn')).toBeTruthy();
  expect(screen.getByText('Shed')).toBeTruthy();
  expect(
    screen.getAllByText(/^Status: /).map(text => text.props.children),
  ).toEqual([
    'Status: Connected',
    'Status: Disconnected',
    'Status: Blacklisted',
  ]);
  // The tower follows the connection alone, so a blacklisted hub that is connected is yellow too.
  expect(towerColours()).toEqual([
    kCartellYellow,
    kCartellDarkGray,
    kCartellYellow,
  ]);
});

test('a blacklisted hub shows the amber warning instead of the picture', async () => {
  await show();
  expect(
    screen.getAllByText(String.fromCodePoint(0xf02a0), {
      includeHiddenElements: true,
    }),
  ).toHaveLength(1);
});

test('a hub re-fetched elsewhere redraws its card', async () => {
  await show();
  await act(async () => {
    parseDevice({ ...gate, name: 'Front Gate' });
  });
  expect(screen.getByText('Front Gate')).toBeTruthy();
});

test('tapping a card opens that hub', async () => {
  devicesBloc.add.mockClear();
  const [gateDevice] = await show();
  await fireEvent.press(screen.getByText('Gate'));
  expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  const event = devicesBloc.add.mock.calls[0][0];
  expect(event).toBeInstanceOf(GoToSpecificDeviceEvent);
  expect(event.device).toBe(gateDevice);
});

/** Lays the list out 600 high with `contentHeight` of content, and pulls it down 212. */
async function pullHubsList(contentHeight: number) {
  const list = screen.getByTestId('hubs-list');
  await fireEvent(list, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 600 } },
  });
  await fireEvent(list, 'contentSizeChange', 360, contentHeight);
  // Armed past a quarter of the list's height × 2/3, at half the finger's travel: 200 here.
  await act(async () => {
    fireGestureHandler(getByGestureTestId('liquid-pull-to-refresh'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 8 },
      { state: State.ACTIVE, translationY: 220 },
      { state: State.END, translationY: 220 },
    ]);
  });
}

/** The clock, one 16 ms frame at a time. */
async function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });
  }
}

describe('pull-to-refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.replaceProperty(Platform, 'OS', 'android');
    devicesBloc.add.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  test('pulling a list taller than the screen asks the bloc for the hubs again, 2 s after the spring', async () => {
    await show();
    await pullHubsList(1200);
    await advance(2900);
    expect(devicesBloc.add).not.toHaveBeenCalled();
    await advance(200);
    expect(devicesBloc.add).toHaveBeenCalledTimes(1);
    expect(devicesBloc.add.mock.calls[0][0]).toBeInstanceOf(RefreshDevices);
  });

  test('a list that fits on the screen cannot be pulled', async () => {
    await show();
    await pullHubsList(500);
    expect(screen.queryByTestId('liquid-pull-to-refresh-band')).toBeNull();
    await advance(4000);
    expect(devicesBloc.add).not.toHaveBeenCalled();
  });
});
