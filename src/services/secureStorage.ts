// Port of frontend/lib/services/secure_storage.dart (spec 03 §4), on react-native-keychain
// (iOS Keychain, Android Keystore-encrypted storage). Every key is prefixed with the *current*
// environment name, so each server keeps its own sign-in.
//
// Part 3 foundation: only what Register and Log In use is here so far.
// LATER(part 14): the FCM token (getFCMToken / setFCMToken).
// LATER(part 19): reading and deleting the feedback flag (getShowFeedback / deleteShowFeedback).
// LATER(part 16): the one-off migration that reads what the Flutter app stored (decision D4).

import * as Keychain from 'react-native-keychain';

import { getEnvironmentName } from '../config/environment';

const key = (suffix: string) => `${getEnvironmentName()}_${suffix}`;
const keys = {
  access: () => key('access'),
  refresh: () => key('refresh'),
  email: () => key('email'),
  password: () => key('password'),
  credsSaved: () => key('false'),
  userFeedback: () => key('feedbackToken'),
  biometricsEnabled: () => key('biometricsEnabled'),
};

async function read(name: string): Promise<string | null> {
  const entry = await Keychain.getGenericPassword({ service: name });
  return entry ? entry.password : null;
}

// flutter_secure_storage's write with a null value deletes the key.
async function write(
  name: string,
  value: string | null | undefined,
): Promise<void> {
  if (value === null || value === undefined) {
    await remove(name);
    return;
  }
  await Keychain.setGenericPassword(name, value, { service: name });
}

async function remove(name: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: name });
}

/** An empty string is not a usable token but passes `!= null` checks. */
const emptyToNull = (value: string | null) =>
  value === null || value === '' ? null : value;

export const SecureStorage = {
  setAccessToken: (access: string | null | undefined) =>
    write(keys.access(), access),
  getAccessToken: async () => emptyToNull(await read(keys.access())),
  deleteAccessToken: () => remove(keys.access()),

  setRefreshToken: (refresh: string | null | undefined) =>
    write(keys.refresh(), refresh),
  getRefreshToken: async () => emptyToNull(await read(keys.refresh())),
  deleteRefreshToken: () => remove(keys.refresh()),

  /**
   * Clears the email, password and "creds saved" flag very old app versions stored. Nothing
   * writes these keys any more, so it is safe to call every time a session starts or ends.
   */
  purgeLegacyCredentials: async () => {
    await remove(keys.password());
    await remove(keys.email());
    await remove(keys.credsSaved());
  },

  /** One of the legacy keys; a successful password change deletes it on its own. */
  deletePassword: () => remove(keys.password()),

  /** Stored as "true" / "false", as Dart's bool.toString writes it. */
  setShowFeedback: (showFeedback: boolean) =>
    write(keys.userFeedback(), String(showFeedback)),

  /**
   * Whether the user has opted into unlocking with a biometric. Three-valued on purpose: null
   * means they have never been asked, which is what stops the opt-in prompt reappearing after
   * they decline it. Only the Account Settings switch moves it back off false (shown when the
   * device can do it, the preference is on, or it could not be read). Deleting the account
   * deletes the preference too.
   */
  getBiometricsEnabled: async (): Promise<boolean | null> => {
    const raw = await read(keys.biometricsEnabled());
    if (raw === null || raw === '') {
      return null;
    }
    return raw === 'true';
  },
  setBiometricsEnabled: (enabled: boolean) =>
    write(keys.biometricsEnabled(), String(enabled)),
  deleteBiometricsEnabled: () => remove(keys.biometricsEnabled()),
};
