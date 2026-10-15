# 20 — Push and In-App Notifications

## In short

Notifications are the product: when a sensor detects a vehicle (or a hub connects or disconnects),
the **server** sends a push notification to every phone registered to the account. The app's job is
to (1) get the phone's permission to show notifications, (2) register the phone's push address
(its **FCM token**) with the server, keep it up to date and remove it on logout, and (3) display
alerts that arrive while the app is open. The app does not decide *what* is sent; that is set by
the alert switches on the account, each hub and each sensor.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Flutter source** | `utilities/notifications.dart` (Firebase setup), `services/notifications.dart` (permission and on-screen display), `services/auth_manager/check_creds.dart` (token registration), `services/requests/user_requests.dart`, `bloc/auth/events/attempt_log_out_event.dart`, `ios/Runner/AppDelegate.swift` |
| **Detailed spec** | `docs/spec/09-notifications.md` · `01-platform-shell.md` §2.2 |
| **Porting plan** | Phase 8 |

## Which alerts a user gets: the switches

| Level | Switch | Where | Server field |
|---|---|---|---|
| Account | "Receive Notifications:" | [Account settings](22-account-settings.md) | profile `should_send_notification` |
| Account | "Receive Email Notifications:" | Account settings | user `should_send_emails` |
| Hub | "Receive Hub Notifications:" | [Hub settings](13-hub-settings.md) | hub `should_send_notification` |
| Hub | "Receive Connection Notifications:" | Hub settings | hub `should_send_connection_notification` |
| Hub | "Receive Email Notifications:" | Hub settings | hub `should_send_email` |
| Sensor | "Receive Sensor Notifications:" | [Sensor details](18-sensor-details.md) | sensor `should_send_notification` |

The server combines these to decide who is notified. The app only stores the switches.

## How a notification looks

| App state | What appears | Who draws it |
|---|---|---|
| **Closed or in the background** | A normal system notification with the title and text from the server, the Cartell icon and the default sound. On Android it is filed under a channel named **"Miscellaneous"**. | The phone (Android: Firebase; iOS: the system) |
| **Open on screen** | The app shows the notification itself as a system banner, with sound. On Android it is high-priority (pops down from the top) on a channel also named **"Miscellaneous"**. | The app |

- **Tapping a notification** opens the app normally (or brings it to the front). There is no jump
  to the event or hub; a cold start runs the normal start-up and lands on the Hubs list.
- **Only one in-app notification at a time**: each new one shown while the app is open replaces the
  previous one, because they all use the same ID (Q21).
- **Silent data messages** (the server can send these without text) are received and logged but
  never shown.
- The server's test notification reads "Test Notification" / "You can ignore this."

## Permission

The app asks for notification permission (Android 13+ "Allow Cartell to send you notifications?",
and the iOS alert/sound/badge prompt) **whenever permission is not yet granted** at these moments:

1. after a successful login
2. during automatic sign-in at start-up
3. every time the Hubs list opens

If the user has refused, the request is repeated at those moments. The phone decides whether a
prompt is actually shown again (iOS never re-asks after a refusal; Android stops asking after
repeated refusals). The app never sends users to Settings for this and never explains a refusal.

## The push token (how the server knows where to send)

Each phone install has a token from Firebase Cloud Messaging. The app keeps a copy in secure
storage (`<ENV>_fcmToken`) and registers it with the server along with the phone's model name
(e.g. "Pixel 7" or "iPhone 15 Pro") and platform ("Android" or "iOS").

| When | What the app does |
|---|---|
| Login | Asks the server whether the stored token is still valid; gets the current token from Firebase; stores it if it changed; registers it |
| Automatic sign-in | Gets the current token from Firebase, stores it if changed, and **always** registers it |
| Every time the Hubs list opens | Registers the stored token again (Q23) |
| Firebase issues a new token | Stores it, and registers it if someone is signed in |
| Log out | Unregisters the token on the server, tells Firebase to discard it, and deletes the stored copy |
| Server switched in the debug menu | Deletes the stored token (see [29](29-environments-and-test-builds.md)) |

## What the app asks of the server

| Request | Sends | Expects |
|---|---|---|
| `POST /notifications/register_device/` | `token`, `device_name`, `platform` | anything (the reply is only logged) |
| `POST /notifications/register_device/validate/` | `token` | JSON `{"valid": true or false}` |
| `DELETE /notifications/register_device/` | `token` | ignored |

All are signed-in requests. A failed registration is reported to Sentry (code `938dc`) and
otherwise ignored.

## Android notification channels

Android lets users control notifications per "channel". This app ends up with **two channels, both
named "Miscellaneous"** (Q22):

- one used by Firebase for notifications that arrive while the app is closed (its built-in
  fallback channel, because the app does not name a default)
- one created by the app (internal ID `?`) for notifications it shows while open, at maximum
  importance with sound

The React Native app must produce the same two channels with the same IDs, so that users upgrading
from the Flutter app keep their settings.

## Odd but true

- **Q21**: in-app notifications replace each other instead of stacking.
- **Q22**: two Android channels with the same name.
- **Q23**: the token is re-registered on every visit to the Hubs list.
- **On iOS, a notification that arrives while the app is open is drawn by the app, not by iOS.**
  The app does not ask iOS to show it, so only the app's own copy appears and there is never a
  duplicate.

## Related

- [01 App start](01-app-start-and-automatic-sign-in.md) · [04 Log in](04-log-in.md) ·
  [06 Log out](06-session-and-log-out.md) · [22 Account settings](22-account-settings.md) ·
  [32 Permissions](32-permissions-and-platform-behaviour.md)
