# 09 — Push and Local Notifications

Plan steps: 8.1–8.5, 3.2 (no notification meta-data), 19.1. Sources:
`utilities/notifications.dart`, `services/notifications.dart`,
`services/auth_manager/check_creds.dart`, `services/requests/user_requests.dart`,
`bloc/auth/events/attempt_log_out_event.dart`, `ios/Runner/AppDelegate.swift`,
`backend/notifications/messages.py` (read only).

## 1. What the backend sends (unchanged)

From `backend/notifications/messages.py:55-66`, the **alert message** is:

```
messaging.Message(
  notification=messaging.Notification(title=…, body=…),
  token=…,
  android=AndroidConfig(priority="high"),
  apns=APNSConfig(payload=APNSPayload(aps=Aps(sound="default"))))
```

From `messages.py:141-148`, the **silent message** is
`data={…}, android priority high, apns headers {"apns-priority": "10"},
aps content_available=True`. The Flutter app never shows anything for it.

The test notification has title "Test Notification" and body "You can ignore this."
(`send_test_notification`).

## 2. Firebase init (`utilities/notifications.dart` → `initFirebase()`, called at startup)

- `Firebase.initializeApp()`.
- `onBackgroundMessage(handler)`: the handler only logs (`Handling a background message: <id>`
  and the data). There is no UI.
- `onMessage` (foreground):
  - With `message.notification` → `NotificationApi.showNotification(title, body)`, then log the
    title, body and data.
  - Without it → log a warning "No notification in message?". Nothing is shown.
- `onTokenRefresh(newToken)`: if it differs from the stored `<ENV>_fcmToken`, store it. If an
  access token exists, `sendFCMToken()`.
- There is **no** `getInitialMessage` or `onMessageOpenedApp` handling. Tapping a notification
  just opens or resumes the app with no deep link.
- There is no `setForegroundNotificationPresentationOptions`. On iOS the system banner for a
  remote notification is therefore suppressed in the foreground, and the user sees the **local**
  notification shown by `onMessage`.

## 3. Local notifications (`services/notifications.dart`, `flutter_local_notifications 18.0.1`)

- `init()`:
  - Android `AndroidInitializationSettings('@mipmap/ic_launcher')`; iOS
    `DarwinInitializationSettings(requestAlertPermission, requestSoundPermission,
    requestBadgePermission: true)`.
  - If `Permission.notification.isDenied || isLimited` → `Permission.notification.request()`.
  - `initialize(settings)` with no tap callback.
- `showNotification(id = 0, title, body)` → `show(0, …)`. **The id is always 0, so a new
  foreground notification replaces the previous one.**
- `NotificationDetails`:
  - Android: `AndroidNotificationDetails(channelId '?', channelName 'Miscellaneous', importance:
    max, playSound: true)`. Defaults otherwise: priority default, small icon from init, no
    group.
  - iOS: `DarwinNotificationDetails(presentSound: true)`. Alert, badge, banner and list fall back
    to the plugin defaults (true).
- `onNotifications` (`BehaviorSubject`) is unused.

## 4. Background and terminated display (system-rendered)

- Android: FCM shows the notification message itself. The manifest sets **no**
  `default_notification_channel_id`, so FCM uses its fallback channel
  `fcm_fallback_notification_channel`, labelled "Miscellaneous" by the Firebase SDK. The small
  icon is the app icon (no `default_notification_icon`), with no colour. **Android settings
  therefore list two channels, both named "Miscellaneous"** (the local `?` channel and the FCM
  fallback). The RN app must recreate both, with the same ids, names and importance, and set no
  default-channel meta-data.
- iOS: APNs shows the alert with the default sound.

## 5. Permission requests (when the OS prompt appears)

`NotificationApi.init()` is the only requester. It runs:

1. On login success (not awaited)
2. In `autoLoginMethodOnTheLoadScreen` (not awaited)
3. In `validateFCMToken()` (awaited)
4. In `fullLogin()`, from `DevicesScreen.initState`, so on **every** Hubs-list mount

Android 13+ shows the `POST_NOTIFICATIONS` prompt. iOS shows the system alert/sound/badge
prompt. Capture the order and timing in Phase 1.5.

## 6. Token lifecycle with the backend

| When | What |
|---|---|
| Login success | `getFCMToken()`: validate (`POST …/register_device/validate/`), compare with Firebase, store, `sendFCMToken()` |
| Auto-login | `validateFCMToken()`: `getToken()` → store if changed → **always** send |
| Hubs mount | `fullLogin()` → `sendFCMToken()` (not awaited) |
| Token refresh | store, and send if signed in |
| Logout | `DELETE …/register_device/ {token}`, `FirebaseMessaging.deleteToken()`, delete the stored token |
| Debug env switch | delete the stored token for the new environment prefix |

`sendFCMToken` body: `{token, device_name: getDeviceName(), platform: "Android" | "iOS"}`. It is
authenticated (JWT).

## 7. Parity checklist (Phase 8.5 and 19.1)

- [ ] Foreground alert on Android: heads-up on channel `?` / "Miscellaneous", max importance,
      sound, launcher icon. A second alert replaces the first.
- [ ] Foreground alert on iOS: a banner from the local notification with sound. No duplicate
      remote banner.
- [ ] Background and killed: OS-rendered, same channel, icon and sound as Flutter.
- [ ] Silent data message: nothing visible in any state.
- [ ] Tapping any notification opens the app normally (cold start runs auto-login) with no
      navigation.
- [ ] After upgrading from Flutter, no third channel appears, existing channel settings (if the
      user changed them) are kept, and the token keeps working or re-registers.
