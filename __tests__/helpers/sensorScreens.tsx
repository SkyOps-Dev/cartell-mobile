// Shared set-up for the sensor screens' tests: the providers a hub-area screen sits in (as
// DevicesRouter places it), a fake Node with a signed-in session, a sensor as the server sends it,
// the ⋮ menu, Android Back, and the clock in 16 ms frames.

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
import { popMenu, PopupMenuHost } from '../../src/components/popups/PopupMenu';
import { PopupHost, popPopup } from '../../src/components/popups/popups';
import {
  resetToastsForTests,
  ToastHost,
} from '../../src/components/popups/toasts';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import type { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import type { DevicesBloc } from '../../src/state/devices/devicesBloc';
import { DevicesBlocProvider } from '../../src/state/devices/DevicesBlocContext';
import type { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
import { installFakeServer } from './fakeServer';
import { hubJson } from './hubJson';

type Json = Record<string, unknown>;

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

export const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

export const devicesBloc = { add: jest.fn() };

/** The one event the screen added. */
export function onlyEvent() {
  expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  return devicesBloc.add.mock.calls[0][0];
}

let nextId = 8000;
/** A hub no other test has cached. */
export const freshHub = (overrides: Parameters<typeof hubJson>[0] = {}) =>
  hubJson({ id: nextId++, ...overrides });

let nextSensorId = 8500;
/** A sensor as GET /sensors/{id}/ returns it, with an id no other test has cached. */
export const sensorJson = (overrides: Json = {}) => ({
  id: nextSensorId++,
  sensor_id: '0xc1230001',
  name: 'Front Door',
  longitude: null,
  latitude: null,
  has_low_battery: false,
  is_active: true,
  should_send_notification: true,
  connection_date: '2026-11-12T06:46:14.273000-06:00',
  disconnection_date: null,
  fw_version: 211,
  sensor_type: 'PUCK',
  is_blacklisted: false,
  ...overrides,
});

export const backHandlers: (() => boolean | null | undefined)[] = [];

/** Spies that jest.restoreAllMocks would remove, so they are made before each test. */
export function installSensorScreenHooks() {
  beforeEach(async () => {
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
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 10, 12, 15, 42));
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

  afterEach(async () => {
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        popPopup();
        popMenu();
      });
      await advance(400);
    }
    await act(async () => resetToastsForTests());
    jest.useRealTimers();
    jest.restoreAllMocks();
    backHandlers.length = 0;
  });
}

/** Node, signed in, with the given replies. */
export function serve(
  replies: Record<string, { status: number; body?: unknown }> = {},
) {
  return installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    ...replies,
  });
}

/** What was sent, past the maintenance probe and the session check. */
export const sent = (requests: { method: string; path: string }[]) =>
  requests
    .filter(
      r => r.path !== '/maintenance-mode/' && r.path !== '/auth/jwt/verify',
    )
    .map(r => `${r.method} ${r.path}`);

export async function show(page: React.ReactElement) {
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
                  {/* DevicesRouter's PopScope, which keeps Back on the page. */}
                  <PopScope canPop={false}>{page}</PopScope>
                  <PopupMenuHost />
                </PopupHost>
              </ToastHost>
            </DevicesBlocProvider>
          </MainAppBlocProvider>
        </AuthBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
}

/** The clock, one 16 ms frame at a time (Reanimated's test runner needs the steps). */
export async function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });
  }
}

export async function pressBack() {
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler()) {
        return;
      }
    }
  });
}

const layout = (width: number, height: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height } },
});

export async function openMenu() {
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
}

/** A quick tap on the screen's one switch (a PanResponder, which ignores fireEvent.press). */
export async function tapSwitch() {
  const handlers = screen.getByRole('switch').props as {
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
  await advance(500);
}

/** A glyph by its codepoint (icons are hidden from screen readers, as in Flutter). */
export const glyph = (codePoint: number) =>
  screen.getByText(String.fromCodePoint(codePoint), {
    includeHiddenElements: true,
  });
export const queryGlyph = (codePoint: number) =>
  screen.queryByText(String.fromCodePoint(codePoint), {
    includeHiddenElements: true,
  });
export const glyphColour = (codePoint: number) =>
  (glyph(codePoint).props.style as { color: string }[]).at(-1)!.color;
