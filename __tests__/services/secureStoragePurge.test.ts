// Ported from frontend/test/services/secure_storage_purge_test.dart
// The purge deletes keys nothing can read back, so the only way to see it is to watch the store.

import * as Keychain from 'react-native-keychain';

import {
  getEnvironmentName,
  setEnvironmentName,
} from '../../src/config/environment';
import { SecureStorage } from '../../src/services/secureStorage';

const store = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;
const reset = Keychain.resetGenericPassword as jest.Mock;

const deletedKeys = () =>
  reset.mock.calls.map(([options]) => options.service as string);

describe('SecureStorage.purgeLegacyCredentials', () => {
  beforeEach(() => {
    store.clear();
    reset.mockClear();
  });

  test('deletes the password, the email and the creds-saved flag', async () => {
    await SecureStorage.purgeLegacyCredentials();
    const env = getEnvironmentName();
    expect(deletedKeys()).toEqual([
      `${env}_password`,
      `${env}_email`,
      `${env}_false`,
    ]);
  });

  test('leaves the session tokens alone', async () => {
    await SecureStorage.setAccessToken('a');
    await SecureStorage.setRefreshToken('r');
    await SecureStorage.purgeLegacyCredentials();
    expect(await SecureStorage.getAccessToken()).toBe('a');
    expect(await SecureStorage.getRefreshToken()).toBe('r');
  });

  test('is safe to run twice', async () => {
    await SecureStorage.purgeLegacyCredentials();
    await expect(
      SecureStorage.purgeLegacyCredentials(),
    ).resolves.toBeUndefined();
  });

  test('scopes keys to the current environment', async () => {
    const original = getEnvironmentName();
    setEnvironmentName('BETA');
    try {
      await SecureStorage.purgeLegacyCredentials();
      // An unprefixed delete would silently miss the real key and report success.
      for (const key of deletedKeys()) {
        expect(key.startsWith('BETA_')).toBe(true);
      }
    } finally {
      setEnvironmentName(original);
    }
  });
});
