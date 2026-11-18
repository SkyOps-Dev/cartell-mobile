// Ported from frontend/test/services/secure_storage_test.dart
// An empty string is not a usable token, but it is not null either, so it would slip past every
// `!= null` guard in the auth flow and reach the server as {token: ''}. The accessors read an
// empty value back as null; anything else comes back untouched.

import * as Keychain from 'react-native-keychain';

import { SecureStorage } from '../../src/services/secureStorage';

const store = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

beforeEach(() => store.clear());

describe('empty stored values read back as null', () => {
  test('getAccessToken', async () => {
    await SecureStorage.setAccessToken('');
    expect(await SecureStorage.getAccessToken()).toBeNull();
  });

  test('getRefreshToken', async () => {
    await SecureStorage.setRefreshToken('');
    expect(await SecureStorage.getRefreshToken()).toBeNull();
  });

  test('getFCMToken', async () => {
    await SecureStorage.setFCMToken('');
    expect(await SecureStorage.getFCMToken()).toBeNull();
  });
});

describe('null stays null', () => {
  test('getAccessToken', async () => {
    expect(await SecureStorage.getAccessToken()).toBeNull();
  });
});

describe('real values are returned untouched', () => {
  test('getAccessToken', async () => {
    await SecureStorage.setAccessToken('a-real-token');
    expect(await SecureStorage.getAccessToken()).toBe('a-real-token');
  });

  test('getRefreshToken', async () => {
    await SecureStorage.setRefreshToken('a-real-refresh');
    expect(await SecureStorage.getRefreshToken()).toBe('a-real-refresh');
  });

  test('a whitespace-only value is NOT treated as empty', async () => {
    // Only the empty string is normalized; trimming would silently alter real values.
    await SecureStorage.setAccessToken(' ');
    expect(await SecureStorage.getAccessToken()).toBe(' ');
  });
});

describe('the push token (spec 09 §6)', () => {
  test('is stored per environment, and a null write or deleteFCMToken removes it', async () => {
    await SecureStorage.setFCMToken('t1');
    expect(await SecureStorage.getFCMToken()).toBe('t1');
    expect([...store.keys()].some(k => k.endsWith('_fcmToken'))).toBe(true);
    await SecureStorage.setFCMToken(null);
    expect(await SecureStorage.getFCMToken()).toBeNull();
    await SecureStorage.setFCMToken('t2');
    await SecureStorage.deleteFCMToken();
    expect(await SecureStorage.getFCMToken()).toBeNull();
  });
});
