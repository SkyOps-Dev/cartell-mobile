// AttemptLogOutEvent (attempt_log_out_event.dart), and the ordering rule from
// frontend/test/services/legacy_credential_purge_wiring_test.dart ("logout, after the tokens and
// before the state change"), checked by running the event instead of reading the source.

import * as Keychain from 'react-native-keychain';

import type {
  PopupDialog,
  RenderedMessage,
} from '../../src/components/popups/messages';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import {
  AttemptLogOutEvent,
  AuthBloc,
  AuthState,
  IsOnDevicesScreenState,
  IsOnWelcomeScreenState,
} from '../../src/state/auth/authBloc';
import { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { flush } from '../helpers/fakeServer';

const keychain = (
  Keychain as unknown as { __store: Map<string, { password: string }> }
).__store;

/** A bloc on the signed-in screen with a session stored, recording what happens next. */
async function signedInBloc() {
  keychain.clear();
  const bloc = new AuthBloc();
  await flush();
  expect(bloc.state).toBeInstanceOf(IsOnWelcomeScreenState);
  bloc.add({
    handleEvent: async (_bloc, emit) =>
      emit(
        new IsOnDevicesScreenState(null, 'a@b.com', new MainAppBloc(bloc), []),
      ),
  });
  await flush();
  await SecureStorage.setAccessToken('access');
  await SecureStorage.setRefreshToken('refresh');
  const states: AuthState[] = [];
  const messages: RenderedMessage[] = [];
  bloc.subscribe(() => states.push(bloc.state));
  bloc.onMessage(m => messages.push(m));
  return { bloc, states, messages };
}

/** Logs out up to the dialog and returns it. */
async function askToLogOut(bloc: AuthBloc, messages: RenderedMessage[]) {
  bloc.add(new AttemptLogOutEvent());
  await flush();
  expect(messages).toHaveLength(1);
  return messages[0] as PopupDialog;
}

/** Presses Okay, as drawMessage does: onOkay is not awaited. */
async function pressOkay(dialog: PopupDialog) {
  dialog.onOkay();
  for (let i = 0; i < 5; i++) {
    await flush();
  }
}

beforeEach(() => AuthRequestManager.resetSingleFlightForTesting());
afterEach(() => jest.restoreAllMocks());

describe('AttemptLogOutEvent', () => {
  test('asks first, and asking changes nothing', async () => {
    const { bloc, states, messages } = await signedInBloc();
    const dialog = await askToLogOut(bloc, messages);
    expect(dialog).toMatchObject({
      kind: 'PopupDialog',
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
    });
    // Cancel never calls onOkay: the user stays signed in.
    expect(states).toHaveLength(0);
    expect(await SecureStorage.getRefreshToken()).toBe('refresh');
    expect(await SecureStorage.getAccessToken()).toBe('access');
  });

  test('Okay clears the session and goes to Welcome', async () => {
    const { bloc, states, messages } = await signedInBloc();
    await pressOkay(await askToLogOut(bloc, messages));
    expect(await SecureStorage.getRefreshToken()).toBeNull();
    expect(await SecureStorage.getAccessToken()).toBeNull();
    expect(states[states.length - 1]).toBeInstanceOf(IsOnWelcomeScreenState);
    expect(messages).toHaveLength(1);
  });

  test('refresh token first, then access, then the legacy purge, then Welcome', async () => {
    const { bloc, states, messages } = await signedInBloc();
    const order: string[] = [];
    const record = (name: string, method: keyof typeof SecureStorage) => {
      const original = SecureStorage[method] as () => Promise<void>;
      jest.spyOn(SecureStorage, method).mockImplementation((async () => {
        order.push(name);
        await original();
      }) as never);
    };
    record('refresh', 'deleteRefreshToken');
    record('access', 'deleteAccessToken');
    record('purge', 'purgeLegacyCredentials');
    bloc.subscribe(() => order.push(bloc.state.constructor.name));
    await pressOkay(await askToLogOut(bloc, messages));
    expect(order).toEqual([
      'refresh',
      'access',
      'purge',
      'IsOnWelcomeScreenState',
    ]);
    expect(states[states.length - 1]).toBeInstanceOf(IsOnWelcomeScreenState);
  });

  test('if the session cannot be cleared, it says so and stays signed in', async () => {
    const { bloc, states, messages } = await signedInBloc();
    jest
      .spyOn(SecureStorage, 'deleteRefreshToken')
      .mockRejectedValue(new Error('keystore'));
    const purge = jest.spyOn(SecureStorage, 'purgeLegacyCredentials');
    await pressOkay(await askToLogOut(bloc, messages));
    expect(messages[1]).toEqual({
      kind: 'PopupError',
      title: 'Could Not Sign Out',
      message: 'Your session could not be cleared. Please try again.',
    });
    expect(states).toHaveLength(0);
    expect(purge).not.toHaveBeenCalled();
  });

  test('a failing access-token delete is the same failure', async () => {
    const { bloc, states, messages } = await signedInBloc();
    jest
      .spyOn(SecureStorage, 'deleteAccessToken')
      .mockRejectedValue(new Error('keystore'));
    await pressOkay(await askToLogOut(bloc, messages));
    expect(messages[1]).toMatchObject({ title: 'Could Not Sign Out' });
    expect(states).toHaveLength(0);
    // The refresh token went first, so what is left cannot be renewed.
    expect(await SecureStorage.getRefreshToken()).toBeNull();
  });

  test('a failing purge is best effort: the log-out still finishes', async () => {
    const { bloc, states, messages } = await signedInBloc();
    jest
      .spyOn(SecureStorage, 'purgeLegacyCredentials')
      .mockRejectedValue(new Error('keystore'));
    await pressOkay(await askToLogOut(bloc, messages));
    expect(messages).toHaveLength(1);
    expect(states[states.length - 1]).toBeInstanceOf(IsOnWelcomeScreenState);
  });

  test('with shouldLogOut it goes straight to Welcome', async () => {
    const { bloc, states } = await signedInBloc();
    bloc.add(new AttemptLogOutEvent(true));
    await flush();
    expect(states).toHaveLength(1);
    expect(states[0]).toBeInstanceOf(IsOnWelcomeScreenState);
  });
});
