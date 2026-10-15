// Ported from frontend/test/bloc/auth/attempt_logging_in_event_wiring_test.dart and
// attempt_registration_event_wiring_test.dart. The Flutter tests read the Dart source; these check
// the same rules by running the events against a fake server (spec 20, "How to port").

import * as Keychain from 'react-native-keychain';

import * as autofill from '../../src/services/autofill';
import type { RenderedMessage } from '../../src/components/popups/messages';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import {
  AttemptLoggingInEvent,
  AttemptRegistrationEvent,
  AuthBloc,
  AuthState,
  buildErrorMessage,
  IsOnDevicesScreenState,
  IsOnLoginScreenState,
  IsOnRegistrationScreenState,
  IsOnWelcomeScreenState,
} from '../../src/state/auth/authBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

/** A bloc whose launch auto-login has already landed on Welcome: nothing is stored. */
async function recordBloc() {
  keychain.clear();
  const bloc = new AuthBloc();
  await flush();
  expect(bloc.state).toBeInstanceOf(IsOnWelcomeScreenState);
  const states: AuthState[] = [];
  const messages: RenderedMessage[] = [];
  bloc.subscribe(() => states.push(bloc.state));
  bloc.onMessage(m => messages.push(m));
  return { bloc, states, messages };
}

beforeEach(() => AuthRequestManager.resetSingleFlightForTesting());

const maintenanceOk = { 'GET /maintenance-mode/': { status: 200 } };

describe('AttemptLoggingInEvent: the login screen is not swapped out mid-attempt', () => {
  test('the handler never leaves the login screen until success', async () => {
    installFakeServer({
      ...maintenanceOk,
      'POST /auth/jwt/create': { status: 401 },
    });
    const { bloc, states } = await recordBloc();
    bloc.add(new AttemptLoggingInEvent('a@b.com', 'pw'));
    await flush();
    await flush();
    expect(states.every(s => s instanceof IsOnLoginScreenState)).toBe(true);
  });

  test('it marks the existing login state as in flight instead', async () => {
    installFakeServer({
      ...maintenanceOk,
      'POST /auth/jwt/create': { status: 401 },
    });
    const { bloc, states } = await recordBloc();
    bloc.add(new AttemptLoggingInEvent('a@b.com', 'pw'));
    await flush();
    const first = states[0] as IsOnLoginScreenState;
    expect(first.isSubmitting).toBe(true);
    expect(first.temporaryEmail).toBe('a@b.com');
  });

  test('the empty-field guard runs before any in-flight state', async () => {
    const { requests } = installFakeServer(maintenanceOk);
    const { bloc, states } = await recordBloc();
    bloc.add(new AttemptLoggingInEvent('', 'pw'));
    await flush();
    expect(states).toHaveLength(1);
    const state = states[0] as IsOnLoginScreenState;
    expect(state.isSubmitting).toBe(false);
    expect(state.emailError).toBe(true);
    expect(state.passwordError).toBe(false);
    expect(requests).toHaveLength(0);
  });

  test('a 401 shows "Account Not Found" and keeps the email', async () => {
    installFakeServer({
      ...maintenanceOk,
      'POST /auth/jwt/create': { status: 401 },
    });
    const { bloc, states, messages } = await recordBloc();
    bloc.add(new AttemptLoggingInEvent('a@b.com', 'pw'));
    await flush();
    await flush();
    expect(messages).toEqual([
      {
        kind: 'PopupError',
        title: 'Account Not Found',
        message: 'Please check your credentials and try again.',
      },
    ]);
    const last = states[states.length - 1] as IsOnLoginScreenState;
    expect(last.isSubmitting).toBe(false);
    expect(last.temporaryEmail).toBe('a@b.com');
  });

  test('success stores the tokens and lands on the signed-in state, making the same calls', async () => {
    const { requests } = installFakeServer({
      ...maintenanceOk,
      'POST /auth/jwt/create': {
        status: 200,
        body: { access: 'A', refresh: 'R' },
      },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /auth/users/me/': {
        status: 200,
        body: {
          id: 1,
          email: 'a@b.com',
          first_name: 'A',
          last_name: 'B',
          phone_no: '',
          should_send_emails: true,
        },
      },
      'GET /devices/': { status: 200, body: [] },
    });
    const { bloc, states } = await recordBloc();
    bloc.add(new AttemptLoggingInEvent('a@b.com', 'pw'));
    for (let i = 0; i < 20; i++) {
      await flush();
    }
    expect(states[states.length - 1]).toBeInstanceOf(IsOnDevicesScreenState);
    // A maintenance probe precedes every request; setUser verifies the session first.
    expect(requests.map(r => `${r.method} ${r.path}`)).toEqual([
      'GET /maintenance-mode/',
      'POST /auth/jwt/create',
      'GET /maintenance-mode/',
      'GET /maintenance-mode/',
      'POST /auth/jwt/verify',
      'GET /maintenance-mode/',
      'GET /auth/users/me/',
      'GET /maintenance-mode/',
      'GET /maintenance-mode/',
      'GET /devices/',
    ]);
    const login = requests.find(r => r.path === '/auth/jwt/create')!;
    expect(login.body).toBe('email=a%40b.com&password=pw');
    expect(login.headers['content-type']).toBe(
      'application/x-www-form-urlencoded; charset=utf-8',
    );
    const me = requests.find(r => r.path === '/auth/users/me/')!;
    expect(me.headers.authorization).toBe('JWT A');
  });

  describe('the autofill context is committed exactly once, on success only (PARITY_ISSUES P5)', () => {
    const signedIn = {
      ...maintenanceOk,
      'POST /auth/jwt/create': {
        status: 200,
        body: { access: 'A', refresh: 'R' },
      },
      'POST /auth/jwt/verify': { status: 200 },
      'GET /auth/users/me/': {
        status: 200,
        body: {
          id: 1,
          email: 'a@b.com',
          first_name: 'A',
          last_name: 'B',
          phone_no: '',
          should_send_emails: true,
        },
      },
      'GET /devices/': { status: 200, body: [] },
    };
    const attempt = async (routes: Parameters<typeof installFakeServer>[0]) => {
      installFakeServer(routes);
      const finish = jest.spyOn(autofill, 'finishAutofillContext');
      const { bloc } = await recordBloc();
      bloc.add(new AttemptLoggingInEvent('a@b.com', 'pw'));
      for (let i = 0; i < 20; i++) {
        await flush();
      }
      const calls = finish.mock.calls;
      finish.mockRestore();
      return calls;
    };

    test('success: once, asking to save', async () => {
      expect(await attempt(signedIn)).toEqual([[{ shouldSave: true }]]);
    });

    test('401: never', async () => {
      expect(
        await attempt({
          ...maintenanceOk,
          'POST /auth/jwt/create': { status: 401 },
        }),
      ).toEqual([]);
    });

    test('another failure status: never', async () => {
      expect(
        await attempt({
          ...maintenanceOk,
          'POST /auth/jwt/create': { status: 500 },
        }),
      ).toEqual([]);
    });
  });
});

describe('AttemptRegistrationEvent', () => {
  const fields = {
    email: 'a@b.com',
    password: 'Passw0rd!',
    passwordConfirmed: 'Passw0rd!',
    firstName: 'A',
    lastName: 'B',
    phoneNo: '',
  };

  test('it marks the registration state as in flight instead of a loading screen', async () => {
    installFakeServer({
      ...maintenanceOk,
      'POST /auth/users/': { status: 500 },
    });
    const { bloc, states } = await recordBloc();
    bloc.add(new AttemptRegistrationEvent(fields));
    await flush();
    const first = states[0] as IsOnRegistrationScreenState;
    expect(first).toBeInstanceOf(IsOnRegistrationScreenState);
    expect(first.isSubmitting).toBe(true);
  });

  test('the mismatched-password guard returns to the form without a request', async () => {
    const { requests } = installFakeServer(maintenanceOk);
    const { bloc, states, messages } = await recordBloc();
    bloc.add(
      new AttemptRegistrationEvent({ ...fields, passwordConfirmed: 'x' }),
    );
    await flush();
    expect(requests).toHaveLength(0);
    expect(messages[0]).toEqual({
      kind: 'PopupError',
      message: 'Passwords do not match. Please re-enter them and try again.',
      title: 'Unable to Create Account',
    });
    expect(
      (states[states.length - 1] as IsOnRegistrationScreenState).isSubmitting,
    ).toBe(false);
  });

  test('an unhandled status still returns the user to the form', async () => {
    installFakeServer({
      ...maintenanceOk,
      'POST /auth/users/': { status: 503 },
    });
    const { bloc, states, messages } = await recordBloc();
    bloc.add(new AttemptRegistrationEvent(fields));
    await flush();
    await flush();
    expect(messages[0]).toEqual({
      kind: 'PopupError',
      message: 'Something went wrong on our end. Please try again in a moment.',
      title: 'Unable to Create Account',
    });
    const last = states[states.length - 1] as IsOnRegistrationScreenState;
    expect(last.isSubmitting).toBe(false);
    expect(last.email).toBe('a@b.com');
  });

  test('201 shows the swapped success popup (Q3) and opens Login with the email', async () => {
    installFakeServer({
      ...maintenanceOk,
      'POST /auth/users/': { status: 201, body: {} },
    });
    const { bloc, states, messages } = await recordBloc();
    bloc.add(new AttemptRegistrationEvent(fields));
    await flush();
    await flush();
    expect(messages[0]).toMatchObject({
      kind: 'PopupNotification',
      title: 'Your account was created. Please login',
      message: 'Registration Succeeded',
    });
    const last = states[states.length - 1] as IsOnLoginScreenState;
    expect(last).toBeInstanceOf(IsOnLoginScreenState);
    expect(last.temporaryEmail).toBe('a@b.com');
  });

  test('a 400 shows the first problem field, each item after "\\n "', async () => {
    installFakeServer({
      ...maintenanceOk,
      'POST /auth/users/': {
        status: 400,
        body: { password: ['Too short.', 'Too common.'], email: ['Taken.'] },
      },
    });
    const { bloc, messages } = await recordBloc();
    bloc.add(new AttemptRegistrationEvent(fields));
    await flush();
    await flush();
    expect(messages[0]).toEqual({
      kind: 'PopupError',
      message: '\n Taken.',
      title: 'Unable to Create Account',
    });
  });

  test('buildErrorMessage falls back when no known field is present', () => {
    expect(buildErrorMessage({ detail: 'x' })).toBe(
      'An error occurred. Please try again.',
    );
  });

  describe('a credential is saved only once an account exists, inside the 201 branch (PARITY_ISSUES P5)', () => {
    const attempt = async (
      routes: Parameters<typeof installFakeServer>[0],
      overrides: Partial<typeof fields> = {},
    ) => {
      installFakeServer(routes);
      const finish = jest.spyOn(autofill, 'finishAutofillContext');
      const { bloc } = await recordBloc();
      bloc.add(new AttemptRegistrationEvent({ ...fields, ...overrides }));
      for (let i = 0; i < 10; i++) {
        await flush();
      }
      const calls = finish.mock.calls;
      finish.mockRestore();
      return calls;
    };

    test('201: once, asking to save', async () => {
      expect(
        await attempt({
          ...maintenanceOk,
          'POST /auth/users/': { status: 201, body: {} },
        }),
      ).toEqual([[{ shouldSave: true }]]);
    });

    test('400: never', async () => {
      expect(
        await attempt({
          ...maintenanceOk,
          'POST /auth/users/': { status: 400, body: { email: ['taken'] } },
        }),
      ).toEqual([]);
    });

    test('mismatched passwords: never', async () => {
      expect(
        await attempt(maintenanceOk, { passwordConfirmed: 'other' }),
      ).toEqual([]);
    });
  });
});
