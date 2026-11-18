// The push-token helpers of frontend/lib/services/auth_manager/check_creds.dart (spec 09 §6): the
// three source checks ported from frontend/test/services/auth_manager/check_creds_test.dart, then
// each helper's branches against the fake server, and auto sign-in's double permission request
// (quirk Q53).

import fs from 'fs';
import path from 'path';

import { getToken } from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

import {
  autoLoginMethodOnTheLoadScreen,
  fullLogin,
  getFCMToken,
  sendFCMToken,
  validateFCMToken,
  validateToken,
} from '../../src/services/authManager/checkCreds';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { reportError } from '../../src/services/reportError';
import { SecureStorage } from '../../src/services/secureStorage';
import { flush, installFakeServer } from '../helpers/fakeServer';

jest.mock('../../src/services/reportError', () => ({ reportError: jest.fn() }));

const store = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;
const firebaseToken = getToken as jest.Mock;
const ok = { status: 200 };
const REGISTER = 'POST /notifications/register_device/';
const VALIDATE = 'POST /notifications/register_device/validate/';
const tokenCalls = (requests: { method: string; path: string }[]) =>
  requests
    .map(r => `${r.method} ${r.path}`)
    .filter(call => call.includes('/notifications/'));

beforeEach(async () => {
  store.clear();
  (reportError as jest.Mock).mockClear();
  firebaseToken.mockReset();
  firebaseToken.mockResolvedValue('firebase-token');
  AuthRequestManager.resetSingleFlightForTesting();
  await SecureStorage.setAccessToken('A');
});
afterEach(() => jest.restoreAllMocks());

describe('Ported from frontend/test/services/auth_manager/check_creds_test.dart', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../src/services/authManager/checkCreds.ts'),
    'utf8',
  );

  test('validateToken does not force a nullable FCM token', () => {
    expect(source).not.toMatch(/token: token!/);
  });

  test('validateToken returns early when there is no token', () => {
    expect(source).toContain('if (token == null)');
  });

  test('the FCM token is never written to the log', () => {
    expect(source.toUpperCase()).not.toContain('NOTIFICATION TOKEN');
    const code = source.replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(
      /console\s*\.\s*[a-z]+\s*\([^)]*(token|currentFirebaseToken|storedToken|fcmToken)\b/,
    );
  });
});

describe('sendFCMToken', () => {
  test('no stored token: nothing is sent', async () => {
    const { requests } = installFakeServer({ 'GET /maintenance-mode/': ok });
    await sendFCMToken();
    expect(tokenCalls(requests)).toEqual([]);
    expect(reportError).not.toHaveBeenCalled();
  });

  test('sends the token, the model and the platform, form-encoded with the session', async () => {
    await SecureStorage.setFCMToken('stored');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [REGISTER]: { status: 201 },
    });
    await sendFCMToken();
    const sent = requests.find(r => r.path.includes('register_device'))!;
    expect(sent.body).toBe('token=stored&device_name=iPhone+15&platform=iOS');
    expect(sent.headers.authorization).toBe('JWT A');
  });

  test('on Android the model is Build.MODEL (Platform.constants.Model)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest
      .spyOn(Platform, 'constants', 'get')
      .mockReturnValue({ Model: 'RMX5070' } as never);
    await SecureStorage.setFCMToken('stored');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [REGISTER]: { status: 201 },
    });
    await sendFCMToken();
    expect(requests.find(r => r.path.includes('register_device'))!.body).toBe(
      'token=stored&device_name=RMX5070&platform=Android',
    );
  });

  test('a failure is only reported, as 938dc', async () => {
    await SecureStorage.setFCMToken('stored');
    installFakeServer({
      'GET /maintenance-mode/': ok,
      [REGISTER]: () => {
        throw new TypeError('Network request failed');
      },
    });
    await expect(sendFCMToken()).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'SendTokenFailedException',
        cause: 'Error Code 938dc:',
      }),
    );
  });
});

describe('validateToken', () => {
  test('no stored token: false, no request, nothing reported', async () => {
    const { requests } = installFakeServer({ 'GET /maintenance-mode/': ok });
    expect(await validateToken()).toBe(false);
    expect(tokenCalls(requests)).toEqual([]);
    expect(reportError).not.toHaveBeenCalled();
  });

  test.each([
    [200, { valid: true, message: 'Token is valid.' }, true],
    [200, { valid: false, message: 'Token is valid.' }, false],
    [404, { valid: false, message: 'Token was not found.' }, false],
  ])('the server says %s %j: %s', async (status, body, expected) => {
    await SecureStorage.setFCMToken('stored');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [VALIDATE]: { status, body },
    });
    expect(await validateToken()).toBe(expected);
    expect(requests.find(r => r.path.includes('validate'))!.body).toBe(
      'token=stored',
    );
    expect(reportError).not.toHaveBeenCalled();
  });

  test('an answer without a boolean "valid" is reported and false (Dart: not a bool)', async () => {
    await SecureStorage.setFCMToken('stored');
    installFakeServer({
      'GET /maintenance-mode/': ok,
      [VALIDATE]: { status: 400, body: { error: 'Token is required' } },
    });
    expect(await validateToken()).toBe(false);
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});

describe('getFCMToken (sign-in)', () => {
  test('Firebase has a new token: stored and sent', async () => {
    await SecureStorage.setFCMToken('old');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [VALIDATE]: { status: 200, body: { valid: true } },
      [REGISTER]: { status: 201 },
    });
    expect((await getFCMToken()).succeeded).toBe(true);
    expect(await SecureStorage.getFCMToken()).toBe('firebase-token');
    expect(tokenCalls(requests)).toEqual([VALIDATE, REGISTER]);
    expect(requests[requests.length - 1].body).toContain(
      'token=firebase-token',
    );
  });

  test('same token, valid: the stored one is sent', async () => {
    await SecureStorage.setFCMToken('firebase-token');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [VALIDATE]: { status: 200, body: { valid: true } },
      [REGISTER]: { status: 201 },
    });
    await getFCMToken();
    expect(tokenCalls(requests)).toEqual([VALIDATE, REGISTER]);
    expect(firebaseToken).toHaveBeenCalledTimes(1);
  });

  test('same token, not valid: Firebase is asked again, and that token stored and sent', async () => {
    await SecureStorage.setFCMToken('firebase-token');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [VALIDATE]: { status: 200, body: { valid: false } },
      [REGISTER]: { status: 201 },
    });
    await getFCMToken();
    expect(firebaseToken).toHaveBeenCalledTimes(2);
    expect(tokenCalls(requests)).toEqual([VALIDATE, REGISTER]);
  });

  test('Firebase failing: a failed result, nothing sent, nothing thrown', async () => {
    firebaseToken.mockRejectedValue(new Error('SERVICE_NOT_AVAILABLE'));
    const { requests } = installFakeServer({ 'GET /maintenance-mode/': ok });
    expect((await getFCMToken()).failed).toBe(true);
    expect(tokenCalls(requests)).toEqual([]);
  });
});

describe('validateFCMToken (auto sign-in)', () => {
  test('stores a changed token and always sends it', async () => {
    await SecureStorage.setFCMToken('old');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [REGISTER]: { status: 201 },
    });
    expect((await validateFCMToken()).succeeded).toBe(true);
    expect(await SecureStorage.getFCMToken()).toBe('firebase-token');
    expect(tokenCalls(requests)).toEqual([REGISTER]);
  });

  test('sends even when the token is unchanged', async () => {
    await SecureStorage.setFCMToken('firebase-token');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [REGISTER]: { status: 201 },
    });
    await validateFCMToken();
    expect(tokenCalls(requests)).toEqual([REGISTER]);
  });
});

describe('fullLogin (every Hubs mount)', () => {
  test('sends the stored token while mounted, nothing once unmounted', async () => {
    await SecureStorage.setFCMToken('stored');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': ok,
      [REGISTER]: { status: 201 },
    });
    await fullLogin(() => false);
    await flush();
    expect(tokenCalls(requests)).toEqual([]);
    await fullLogin(() => true);
    for (let i = 0; i < 5; i++) {
      await flush();
    }
    expect(tokenCalls(requests)).toEqual([REGISTER]);
  });
});

describe('quirk Q53: auto sign-in on Android 13+ without the notification permission', () => {
  test('the second permission request is refused and the error escapes auto sign-in', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(35);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    let answer: (value: string) => void = () => undefined;
    const request = jest.spyOn(PermissionsAndroid, 'request').mockReturnValue(
      new Promise(resolve => {
        answer = resolve as (value: string) => void;
      }) as never,
    );
    installFakeServer({
      'GET /maintenance-mode/': ok,
      'POST /auth/jwt/verify': ok,
    });
    await expect(autoLoginMethodOnTheLoadScreen()).rejects.toThrow(
      'A request for permissions is already running',
    );
    expect(request).toHaveBeenCalledTimes(1);
    answer(PermissionsAndroid.RESULTS.GRANTED);
    await flush();
  });
});
