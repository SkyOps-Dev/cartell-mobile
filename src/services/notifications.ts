// Port of frontend/lib/services/notifications.dart (NotificationApi): the alert the app draws
// itself, and asking permission for it (spec 09 §3 and §5). Through the CartellNotifications
// native module, which ports flutter_local_notifications 18.0.1:
// - Android: android/.../NotificationsModule.kt (channel "?" / "Miscellaneous", importance max,
//   the default sound, the launcher icon).
// - iOS: ios/Cartell/NotificationsModule.m, with AppDelegate.swift answering whether to show it
//   while the app is open. Written without a Mac: not compiled or tried yet.
// The permission check before initialize is permission_handler 12's (Permission.notification):
// - Android 13+: asked while POST_NOTIFICATIONS is not granted. permission_handler skips the
//   request once Android would no longer show it (denied twice); RN asks and Android answers
//   "never ask again" at once, with nothing on screen either way.
// - Android 12 and earlier: there is no runtime permission and nothing is shown.
// - iOS: permission_handler is built without its notification part (PERMISSION_NOTIFICATIONS
//   unset), so its check says denied and its request does nothing. The prompt comes from
//   initialize.
// onNotifications (a BehaviorSubject) is never used in Flutter, so it is not ported.

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type CartellNotifications = {
  initialize(): Promise<boolean>;
  show(id: number, title: string | null, body: string | null): Promise<void>;
};

function native(): CartellNotifications {
  const module = NativeModules.CartellNotifications as
    | CartellNotifications
    | undefined;
  if (!module) {
    throw new Error('CartellNotifications is not linked');
  }
  return module;
}

// permission_handler_android 13.0.1 (PermissionManager.requestPermissions) refuses a request while
// another is still open, with this error, and Flutter does not catch it. Auto sign-in starts init()
// twice at once (quirk Q53), so a second request is refused here the same way: the error escapes
// validateFCMToken() and auto sign-in lands on Welcome under the prompt, as in Flutter.
const REQUEST_ALREADY_RUNNING =
  'A request for permissions is already running, please wait for it to finish before doing another request (note that you can request multiple permissions at the same time).';
let requestRunning = false;

/** NotificationApi.init(): the permission, then the plugin's initialize. */
async function init(): Promise<void> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!(await PermissionsAndroid.check(permission))) {
      if (requestRunning) {
        throw new Error(REQUEST_ALREADY_RUNNING);
      }
      requestRunning = true;
      try {
        await PermissionsAndroid.request(permission);
      } finally {
        requestRunning = false;
      }
    }
  }
  await native().initialize();
}

/** NotificationApi.showNotification({id = 0, title, body}). */
function showNotification({
  id = 0,
  title,
  body,
}: {
  id?: number;
  title?: string | null;
  body?: string | null;
}): Promise<void> {
  return native().show(id, title ?? null, body ?? null);
}

export const NotificationApi = { init, showNotification };
