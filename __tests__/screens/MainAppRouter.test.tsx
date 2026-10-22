// The hand-over from sign-in to the shell (auth_bloc_widget.dart → main_app_bloc_widget.dart →
// devices_bloc_widget.dart; spec 06 §6): a launch with a stored session lands on the Hubs screen,
// sending the requests Flutter sends, in its order; and log out from the side menu leaves it.

import React from 'react';
import * as Keychain from 'react-native-keychain';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PopupHost } from '../../src/components/popups/popups';
import { AuthRouter } from '../../src/screens/AuthRouter';
import { resetUserPersistorForTests } from '../../src/services/data/userPersistor';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import { flush, installFakeServer } from '../helpers/fakeServer';

// A 360 × 800 phone at normal text size (Jest's default window has a font scale of 2, where the
// side menu leaves the email out).
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 800, scale: 3, fontScale: 1 }),
}));

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const user = {
  id: 1,
  email: 'umair@example.com',
  first_name: 'Umair',
  last_name: 'SkyOps',
  phone_no: '',
  should_send_emails: true,
};

beforeEach(async () => {
  AuthRequestManager.resetSingleFlightForTesting();
  resetUserPersistorForTests();
  keychain.clear();
  await SecureStorage.setAccessToken('A');
  await SecureStorage.setRefreshToken('R');
});

async function settle() {
  for (let i = 0; i < 60; i++) {
    await act(flush);
  }
}

test('auto sign-in with no hubs lands on the Hubs screen, fetching the hubs three times', async () => {
  const { requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [] },
    'GET /auth/users/me/': { status: 200, body: user },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PopupHost>
        <AuthRouter />
      </PopupHost>
    </SafeAreaProvider>,
  );
  await settle();

  expect(screen.getByText('No Hubs have been added.')).toBeTruthy();
  const calls = requests
    .map(r => `${r.method} ${r.path}`)
    .filter(call => call !== 'GET /maintenance-mode/');
  // Sign-in's hub health pass, the list for the shell, then the Hubs screen's own fetch (the list
  // was empty, so it shows the loading screen and asks again).
  expect(calls.filter(call => call === 'GET /devices/')).toHaveLength(3);
  expect(calls[calls.length - 1]).toBe('GET /devices/');
  expect(calls.indexOf('GET /auth/users/me/')).toBeLessThan(
    calls.lastIndexOf('GET /devices/'),
  );
});

test('the side menu shows the signed-in user, and Log Out returns to Welcome', async () => {
  installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [] },
    'GET /auth/users/me/': { status: 200, body: user },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PopupHost>
        <AuthRouter />
      </PopupHost>
    </SafeAreaProvider>,
  );
  await settle();

  await fireEvent.press(screen.getByLabelText('Open navigation menu'));
  await settle();
  expect(screen.getByText('Umair SkyOps')).toBeTruthy();
  expect(screen.getByText('umair@example.com')).toBeTruthy();

  await fireEvent.press(screen.getByText('Log Out'));
  await settle();
  expect(screen.getByText('Are you sure you want to log out?')).toBeTruthy();
  await fireEvent.press(screen.getByText('Okay'));
  await settle();
  expect(await SecureStorage.getAccessToken()).toBeNull();
  expect(screen.getAllByText('Log In').length).toBeGreaterThan(0);
});

test('side menu → Account Settings: the skeleton, then the screen; its forms come and go', async () => {
  const { requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [] },
    'GET /auth/users/me/': { status: 200, body: user },
    'GET /profiles/me': {
      status: 200,
      body: {
        user: 1,
        should_send_notification: true,
        locations: [],
        alexa_enabled: false,
      },
    },
    'GET /app/settings/': {
      status: 200,
      body: { id: 1, key: 'alexa_enabled', value: 'false' },
    },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PopupHost>
        <AuthRouter />
      </PopupHost>
    </SafeAreaProvider>,
  );
  await settle();

  await fireEvent.press(screen.getByLabelText('Open navigation menu'));
  await settle();
  const before = requests.length;
  await fireEvent.press(screen.getByText('Account Settings'));
  await settle();
  const calls = requests
    .slice(before)
    .map(r => `${r.method} ${r.path}`)
    .filter(call => call !== 'GET /maintenance-mode/');
  expect(calls).toEqual(
    expect.arrayContaining(['GET /auth/users/me/', 'GET /profiles/me']),
  );
  expect(screen.getByText('Umair SkyOps')).toBeTruthy();
  expect(screen.getByText('Enter Phone Number')).toBeTruthy();

  await fireEvent.press(screen.getByText('Umair SkyOps'));
  await settle();
  expect(screen.getByText('Enter Your Name.')).toBeTruthy();

  await fireEvent.press(
    screen.getByText(String.fromCodePoint(0xf00d), {
      includeHiddenElements: true,
    }),
  );
  await settle();
  expect(screen.queryByText('Enter Your Name.')).toBeNull();
  expect(screen.getByText('Receive Notifications: ')).toBeTruthy();
});
