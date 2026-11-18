// Port of frontend/lib/utilities/notifications.dart (initFirebase; spec 09 §2), called at start-up
// after registerServices, not awaited (index.js, as main.dart's innerMain).
// - Firebase.initializeApp(): already done natively before any JS runs (Android's
//   FirebaseInitProvider, iOS's FirebaseApp.configure() in AppDelegate.swift).
// - A message while the app is open: one with an alert part is shown by the app itself
//   (NotificationApi.showNotification, not awaited); one without only logs.
// - A message while the app is in the background or closed: only logged. RNFB requires this
//   handler to be set at start-up, outside any screen.
// - Firebase's token refresh: stored if it differs, and sent if the user is signed in.
// No getInitialMessage or onMessageOpenedApp: tapping an alert just opens the app, as in Flutter.
// Flutter's log lines are left out until logging is ported (reportError.ts).

import {
  getMessaging,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';

import { sendFCMToken } from '../services/authManager/checkCreds';
import { NotificationApi } from '../services/notifications';
import { reportError } from '../services/reportError';
import { SecureStorage } from '../services/secureStorage';

export function initFirebase(): void {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, backgroundHandler);
  onMessage(messaging, (message: RemoteMessage) => {
    if (message.notification != null) {
      NotificationApi.showNotification({
        title: message.notification.title,
        body: message.notification.body,
      }).catch(reportError);
      // PORT-GAP: log.i the alert's title, body and data ("Message also contained a
      // notification: …").
    } else {
      // PORT-GAP: log.w("No notification in message?").
    }
  });

  // Listen for Firebase token refreshes and update the backend.
  onTokenRefresh(messaging, (newToken: string) => {
    tokenRefreshed(newToken).catch(reportError);
  });
}

async function tokenRefreshed(newToken: string): Promise<void> {
  const oldToken = await SecureStorage.getFCMToken();
  if (newToken === oldToken) {
    return;
  }
  await SecureStorage.setFCMToken(newToken);
  // Only send to backend if user is logged in.
  const accessToken = await SecureStorage.getAccessToken();
  if (accessToken != null) {
    await sendFCMToken();
  }
}

export async function backgroundHandler(
  _message: RemoteMessage,
): Promise<void> {
  // PORT-GAP: log.i("Handling a background message: ${message.messageId}"), log.d(message.data).
}
