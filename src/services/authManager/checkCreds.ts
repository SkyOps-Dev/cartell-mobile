// Port of frontend/lib/services/auth_manager/check_creds.dart (spec 04 §7, spec 08 §3, spec 09 §6):
// what a fresh login stores, the sign-in check auto-login repeats up to three times, and the push
// token's helpers. Flutter's log lines are left out until logging is ported (reportError.ts); none
// of them ever writes a token.

import { getMessaging, getToken } from '@react-native-firebase/messaging';

import { SecureStorage } from '../secureStorage';
import { SendTokenFailedException } from '../exceptions';
import { NotificationApi } from '../notifications';
import type { HttpResponse } from '../requests/networkHelper';
import { AuthRequestManager } from '../requests/authRequests';
import { fetchDevices, queryHubHealth } from '../requests/deviceRequests';
import {
  postMessagingData,
  setUser,
  validateMessagingData,
} from '../requests/userRequests';
import { reportError } from '../reportError';
import { Result } from '../result';
import { getDeviceName, getPlatform } from '../../utilities/deviceInfo';

/**
 * Sends the stored push token with the phone's name and platform. No stored token: nothing is
 * sent. Any failure is only reported (938dc).
 */
export async function sendFCMToken(): Promise<void> {
  try {
    const token = await SecureStorage.getFCMToken();
    if (token == null) {
      // No push token registered on this device. Nothing to send.
      // PORT-GAP: log.i("No FCM token stored; skipping send.").
      return;
    }
    await postMessagingData({
      token,
      type: 'token',
      deviceName: await getDeviceName(),
      platform: await getPlatform(),
    });
    // PORT-GAP: log.i("NOTIFICATION STATUS : ${res.body}").
  } catch {
    reportError(new SendTokenFailedException('Error Code 938dc:'));
  }
}

/**
 * The Hubs screen's every mount (DevicesScreen initState): the permission and initialize, then,
 * if the screen is still mounted, the stored token is sent (not awaited).
 */
export async function fullLogin(isMounted: () => boolean): Promise<void> {
  await NotificationApi.init();
  if (isMounted()) {
    sendFCMToken();
  }
}

/**
 * Asks the server whether the stored token is still good. No stored token: false, unreported.
 * Anything else that fails, including an answer without a boolean "valid", is reported and false.
 */
export async function validateToken(): Promise<boolean> {
  try {
    const token = await SecureStorage.getFCMToken();
    if (token == null) {
      // No push token registered on this device. Not an error, and not something to report:
      // there is simply nothing to validate.
      // PORT-GAP: log.i("No FCM token stored; skipping validation.").
      return false;
    }
    const res = await validateMessagingData({ token });
    // PORT-GAP: log.i("NOTIFICATION STATUS : ${res.body}").
    const response = JSON.parse(res.body);
    // Dart's `return response['valid'];` from a Future<bool>: anything but a bool is a TypeError.
    if (typeof response?.valid !== 'boolean') {
      throw new TypeError('"valid" is not a bool');
    }
    return response.valid;
  } catch (e) {
    reportError(e);
    return false;
  }
}

/** Stores the access and refresh tokens from a login response, then purges legacy keys. */
export async function successfulLoginStartup(
  data: HttpResponse,
): Promise<void> {
  const response = JSON.parse(data.body);
  await SecureStorage.setAccessToken(response.access);
  await SecureStorage.setRefreshToken(response.refresh);
  await SecureStorage.purgeLegacyCredentials();
}

/** GET /devices/, then get_health for every connected hub, one after another. */
export async function queryAllHubsHealth(): Promise<void> {
  const devices = await fetchDevices();
  for (const element of devices) {
    if (element.device.isConnected) {
      await queryHubHealth(element.id);
    }
  }
}

/** One sign-in attempt: session check, push token, hub health, the user. */
export async function autoLoginMethodOnTheLoadScreen(): Promise<Result> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    return Result.failure({ message: 'Failed to authenticate' });
  }
  // Not awaited, as in Flutter, so validateFCMToken's own init() runs alongside it (quirk Q53).
  // A failure of this one goes to the error reporter, as Flutter's zone sends it to Sentry.
  NotificationApi.init().catch(reportError);
  await validateFCMToken();
  await queryAllHubsHealth();
  await setUser();
  return Result.success();
}

/**
 * Auto sign-in's token step: the permission and initialize (awaited, and outside the try, so
 * its failure escapes to the caller), then Firebase's current token, stored if it changed, and
 * always sent.
 */
export async function validateFCMToken(): Promise<Result> {
  await NotificationApi.init();
  try {
    // Always get the current Firebase token to detect refreshes.
    const currentFirebaseToken: string | null = await getToken(getMessaging());
    const storedToken = await SecureStorage.getFCMToken();

    if (currentFirebaseToken == null) {
      throw new Error('Firebase returned a null token.');
    }

    // If tokens differ (or no stored token), update storage.
    if (storedToken !== currentFirebaseToken) {
      await SecureStorage.setFCMToken(currentFirebaseToken);
    }

    // Always send to backend to ensure it has the current token.
    await sendFCMToken();
    return Result.success();
  } catch (e) {
    return Result.failure({ message: String(e) });
  }
}

/**
 * Sign-in's token step: the server's verdict on the stored token, then Firebase's current token.
 * A new Firebase token is stored and sent; otherwise the stored one is sent if the server called
 * it valid; otherwise Firebase's token is fetched again, stored and sent. Every path sends.
 */
export async function getFCMToken(): Promise<Result> {
  try {
    const response = await validateToken();
    const storedToken = await SecureStorage.getFCMToken();

    // Always check if Firebase has issued a newer token.
    const currentFirebaseToken: string | null = await getToken(getMessaging());
    if (currentFirebaseToken != null && currentFirebaseToken !== storedToken) {
      // Stored token is stale: update and re-register.
      await SecureStorage.setFCMToken(currentFirebaseToken);
      await sendFCMToken();
      return Result.success();
    }

    if (response && storedToken != null) {
      await sendFCMToken();
      return Result.success();
    } else {
      const fcmToken: string | null = await getToken(getMessaging());
      await SecureStorage.setFCMToken(fcmToken);
      await sendFCMToken();
      return Result.success();
    }
  } catch (e) {
    return Result.failure({ message: String(e) });
  }
}
