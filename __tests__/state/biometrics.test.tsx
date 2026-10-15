// Part 9: the biometric gate in auto sign-in (auto_login_event.dart), the one-time offer after a
// password login (attempt_logging_in_event.dart _offerBiometricUnlock), the clean-up on log out,
// and the Lock screen (lock_screen.dart).

import React from 'react';
import { NativeModules, Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type {
  PopupDialog,
  RenderedMessage,
} from '../../src/components/popups/messages';
import { LockScreen } from '../../src/screens/welcome/LockScreen';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import {
  AttemptLoggingInEvent,
  AttemptLogOutEvent,
  AuthBloc,
  AuthState,
  AutoLoginEvent,
  GoToLoginScreenEvent,
  IsLockedState,
  IsOnDevicesScreenState,
  IsOnWelcomeScreenState,
} from '../../src/state/auth/authBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';

const mockAdd = jest.fn();
jest.mock('../../src/state/auth/AuthBlocContext', () => ({
  useAuthBloc: () => ({ add: mockAdd }),
}));

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;
const original = NativeModules.CartellLocalAuth;
let native: {
  isDeviceSupported: jest.Mock;
  getEnrolledBiometrics: jest.Mock;
  authenticate: jest.Mock;
};

beforeEach(() => {
  AuthRequestManager.resetSingleFlightForTesting();
  keychain.clear();
  jest.clearAllMocks();
  // An Android phone with an enrolled fingerprint (Jest is iOS by default).
  jest.replaceProperty(Platform, 'OS', 'android');
  native = {
    isDeviceSupported: jest.fn(async () => true),
    getEnrolledBiometrics: jest.fn(async () => ['weak', 'strong']),
    authenticate: jest.fn(async () => 'success'),
  };
  NativeModules.CartellLocalAuth = native;
});
afterEach(() => {
  NativeModules.CartellLocalAuth = original;
  jest.restoreAllMocks();
});

const settle = async (rounds = 40) => {
  for (let i = 0; i < rounds; i++) {
    await flush();
  }
};

const user = {
  id: 1,
  email: 'a@b.com',
  first_name: 'A',
  last_name: 'B',
  phone_no: '',
  should_send_emails: true,
};
const server = {
  'GET /maintenance-mode/': { status: 200 },
  'POST /auth/jwt/create': { status: 200, body: { access: 'A', refresh: 'R' } },
  'POST /auth/jwt/verify': { status: 200 },
  'GET /auth/users/me/': { status: 200, body: user },
  'GET /devices/': { status: 200, body: [] },
};
const sessionCalls = (requests: { method: string; path: string }[]) =>
  requests.filter(r => r.path !== '/maintenance-mode/');

/** Launches with a stored session and the given preference, recording every state. */
async function launch(enabled: boolean | null) {
  await SecureStorage.setAccessToken('A');
  await SecureStorage.setRefreshToken('R');
  if (enabled !== null) {
    await SecureStorage.setBiometricsEnabled(enabled);
  }
  const { requests } = installFakeServer(server);
  const bloc = new AuthBloc();
  const states: AuthState[] = [bloc.state];
  bloc.subscribe(() => states.push(bloc.state));
  await settle();
  return { bloc, states, requests };
}

describe('the gate in auto sign-in', () => {
  test('off or never asked: no prompt, straight on', async () => {
    for (const enabled of [null, false]) {
      keychain.clear();
      const { bloc } = await launch(enabled);
      expect(native.authenticate).not.toHaveBeenCalled();
      expect(bloc.state).toBeInstanceOf(IsOnDevicesScreenState);
    }
  });

  test('on: "Unlock Cartell", then the sign-in carries on', async () => {
    const { bloc } = await launch(true);
    expect(native.authenticate).toHaveBeenCalledTimes(1);
    expect(native.authenticate.mock.calls[0][1].reason).toBe('Unlock Cartell');
    expect(bloc.state).toBeInstanceOf(IsOnDevicesScreenState);
  });

  test('no session: nothing to protect, so no prompt', async () => {
    await SecureStorage.setBiometricsEnabled(true);
    installFakeServer(server);
    const bloc = new AuthBloc();
    await settle();
    expect(native.authenticate).not.toHaveBeenCalled();
    expect(bloc.state).toBeInstanceOf(IsOnWelcomeScreenState);
  });

  test('cancelled or not recognised: the Lock screen, before any server call', async () => {
    native.authenticate.mockResolvedValue('failure');
    const { bloc, requests } = await launch(true);
    expect(bloc.state).toBeInstanceOf(IsLockedState);
    expect((bloc.state as IsLockedState).message).toBeNull();
    expect(sessionCalls(requests)).toHaveLength(0);
  });

  test('locked out: the Lock screen says so', async () => {
    native.authenticate.mockResolvedValue('errorLockedOutTemporarily');
    const { bloc } = await launch(true);
    expect((bloc.state as IsLockedState).message).toBe(
      'Too many attempts. Use your password to sign in instead.',
    );
  });

  test('no longer possible on the phone: the preference is cleared and sign-in carries on', async () => {
    native.authenticate.mockResolvedValue('errorNotEnrolled');
    const { bloc } = await launch(true);
    expect(await SecureStorage.getBiometricsEnabled()).toBe(false);
    expect(bloc.state).toBeInstanceOf(IsOnDevicesScreenState);
  });

  test('the Lock screen cannot be popped (Back)', () => {
    expect(new IsLockedState().isPoppable).toBe(false);
  });
});

describe('the one-time offer after a password login', () => {
  async function logIn() {
    installFakeServer(server);
    const bloc = new AuthBloc();
    await settle(10);
    const messages: RenderedMessage[] = [];
    bloc.onMessage(m => messages.push(m));
    bloc.add(new AttemptLoggingInEvent('a@b.com', 'pw'));
    await settle();
    return { bloc, messages };
  }

  test('offered once on a phone that can do it, recorded as asked before it shows', async () => {
    const { bloc, messages } = await logIn();
    expect(bloc.state).toBeInstanceOf(IsOnDevicesScreenState);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      kind: 'PopupDialog',
      title: 'Unlock with biometrics?',
      message:
        'Use your fingerprint or face to open Cartell instead of typing your password. You can change this later in Account Settings.',
    });
    // Cancel has no callback: "asked" must already be stored.
    expect(await SecureStorage.getBiometricsEnabled()).toBe(false);
  });

  test('Okay turns it on', async () => {
    const { messages } = await logIn();
    (messages[0] as PopupDialog).onOkay();
    await settle(5);
    expect(await SecureStorage.getBiometricsEnabled()).toBe(true);
  });

  test('never asked again, whatever was answered', async () => {
    await SecureStorage.setBiometricsEnabled(false);
    expect((await logIn()).messages).toHaveLength(0);
  });

  test('not offered on a phone with only a PIN', async () => {
    native.getEnrolledBiometrics.mockResolvedValue([]);
    const { messages } = await logIn();
    expect(messages).toHaveLength(0);
    expect(await SecureStorage.getBiometricsEnabled()).toBeNull();
  });

  test('a failing offer never spoils a login that worked', async () => {
    NativeModules.CartellLocalAuth = undefined;
    const { bloc, messages } = await logIn();
    expect(bloc.state).toBeInstanceOf(IsOnDevicesScreenState);
    expect(messages).toHaveLength(0);
  });
});

test('log out deletes the preference, so the next account is asked afresh', async () => {
  const { bloc } = await launch(true);
  const messages: RenderedMessage[] = [];
  bloc.onMessage(m => messages.push(m));
  bloc.add(new AttemptLogOutEvent());
  await settle(5);
  (messages[0] as PopupDialog).onOkay();
  await settle(10);
  expect(bloc.state).toBeInstanceOf(IsOnWelcomeScreenState);
  expect(await SecureStorage.getBiometricsEnabled()).toBeNull();
});

describe('LockScreen', () => {
  const mount = (message: string | null) =>
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <LockScreen message={message} />
      </SafeAreaProvider>,
    );

  test('shows the lock, with the message only when there is one', async () => {
    await mount(null);
    expect(screen.getByText('Cartell is locked')).toBeTruthy();
    expect(screen.queryByText(/Too many attempts/)).toBeNull();
    await mount('Too many attempts. Use your password to sign in instead.');
    expect(
      screen.getByText(
        'Too many attempts. Use your password to sign in instead.',
      ),
    ).toBeTruthy();
  });

  test('Unlock runs the sign-in again; the password way goes to Log In', async () => {
    await mount(null);
    await fireEvent.press(screen.getByText('Unlock'));
    expect(mockAdd.mock.calls[0][0]).toBeInstanceOf(AutoLoginEvent);
    await fireEvent.press(screen.getByText('Use password instead'));
    expect(mockAdd.mock.calls[1][0]).toBeInstanceOf(GoToLoginScreenEvent);
  });
});
