# 32 — Phone Permissions and Platform Behaviour

## In short

This page collects what the app asks the phone for (permissions and system features), how it adapts
to the phone's settings (text size, rotation, screen size, keyboard), and where iPhone and Android
behave differently. It also covers links that leave the app.

| | |
|---|---|
| **Flutter source** | `frontend/android/app/src/main/AndroidManifest.xml`, `frontend/ios/Runner/Info.plist`, `Runner.entitlements`, `utilities/scaling.dart`, `screens/events/phone_rotation_manager.dart`, plus the features linked below |
| **Detailed spec** | `docs/spec/01-platform-shell.md` · `18-cross-cutting.md` |
| **Porting plan** | Phase 3, Phase 16 |

## Permissions and system prompts

| What | When it is asked | Text shown (iOS) | If refused |
|---|---|---|---|
| **Notifications** | After login, at every automatic sign-in and every time the Hubs list opens, while not granted ([20](20-notifications.md)) | system default | Alerts are not shown; the app keeps working and asks again at the next of those moments |
| **Face ID / fingerprint** | When biometric unlock is used ([05](05-biometric-unlock.md)) | "Cartell uses Face ID to unlock the app so you can check your property without typing your password." | Lock screen; password login still works |
| **Camera** | First time the hub QR scanner opens ([10](10-add-a-hub.md)) | "Camera permission is required for barcode scanning." | The scanner cannot scan; the MAC address can be typed instead |
| **Location** | First time **Detect Location** is tapped ([19](19-sensor-location-rename-about-delete.md)) | "This app needs access to location information for storing and accessing locations of devices." | A "Can't Get Location" popup; coordinates can be typed instead |
| **Local network** (iOS) | When pairing first talks to the hub ([11](11-connect-hub-to-wifi.md)) | "Used to connect a HUB to your network." | Pairing cannot reach the hub |
| **Join the hub's Wi-Fi** | Step 4 of pairing, on a phone that has not approved this hub before | iOS: "Join"; Android: "Connect" | Pairing times out with code `762c844a-0` |

Android permissions declared by the app: precise location, Wi-Fi state and change, network state
change and internet. Libraries add camera, notifications, biometrics, vibration, wake lock and
others. iOS entitlements: push notifications, hotspot configuration (to join the hub's network),
Wi-Fi information, and associated domains (password AutoFill for the three Cartell servers).

The Wi-Fi network name, which the app reads to spot a hub's network, may need location permission
on some phones. Without it the name cannot be read and that guard is skipped ([07](07-maintenance-and-no-connection.md)).

## Text size (accessibility)

The app follows the phone's text size everywhere and never caps it. When text is large, layouts
reflow:

| Text scale | What changes |
|---|---|
| above about 1.25× | Hubs empty-state card loses its width limit |
| about 1.4× and up | The menu header hides the email; the feedback panel goes full height; firmware version cards stack |
| about 1.5× and up | Hub cards lose their width limit; label/value rows (About screens, Account Settings) and the three-button rows stack vertically |
| about 1.75× and up | Event history cards put the icon above the text |

Other accessibility details: buttons and icon buttons have spoken labels ("Back", "Show password",
"Help with this step"); hub lights are announced by name; firmware progress is announced every
10%; animations respect the phone's "reduce motion" setting.

## Rotation and screen size

- The app **rotates freely**: portrait and both landscapes on phones, all four orientations on iPads.
- **Wider than 800 px**: the side menu becomes a permanent panel on the left; Welcome, Login and the
  pairing screens use wider margins; the sensors grid gets extra side padding.
- **Wider than 500 px**: many screens add proportional side margins and the history cards centre.

## Keyboard

- The screen shrinks to make room for the keyboard and scrolls.
- Login hides its logo while the keyboard is open.
- Keyboard types: email (login, registration), name (names, sensor name), phone keypad
  (registration only), plain text everywhere else, **including the Edit Phone field and the
  coordinates fields**.
- Login: "next" moves from email to password; "done" logs in.

## Status bar and screen edges

Content stays inside the safe area (away from notches and home bars). Screens with a top bar have
the dark logo bar under the status bar; Welcome, Login, Registration, Lock and Hub Added have no
top bar.

## iPhone vs Android differences

| Area | iPhone | Android |
|---|---|---|
| Launch splash | Solid dark navy | System splash following light/dark mode, with the icon on Android 12+ |
| Fonts | San Francisco | Roboto |
| Back | No system Back; only the QR scanner supports edge-swipe back | System Back mapped screen by screen ([08](08-navigation-and-screen-layout.md)) |
| "Leave App" | **Leave** does nothing | **Leave** closes the app |
| Biometrics | Face ID / Touch ID with passcode fallback | BiometricPrompt with PIN/pattern fallback |
| Pairing Wi-Fi approval | "Join" | "Connect" |
| Pairing: Wi-Fi off warning | not shown | warns and disables "Connect to Hub" |
| Account Settings switch rows | 0 px side padding | 20 px side padding |
| Find Sensor | Apple Maps | the default maps app (`geo:` link) |
| In-app browser | Safari view | Chrome Custom Tab |
| Notification channels | not applicable | two channels named "Miscellaneous" ([20](20-notifications.md)) |
| Analytics | none | Firebase Analytics automatic collection |

## Links that leave the app

| Link | Opens |
|---|---|
| Forgot Password | `<server>/password_reset` (in-app browser) |
| Customer Support | `https://www.cartell.com/hub-support` (in-app browser) |
| FAQ | `https://www.cartell.com/hub-faq` (in-app browser) |
| About Us | `https://cartell.com/about/` (in-app browser) |
| Link to Cartell Skill | Amazon skill store page (in-app browser) |
| Find Sensor | External maps app |

## Language, dates and time

- **English only.** The app has no translations and always formats dates the US way, whatever the
  phone's language.
- Dates: "10-06-2026 03:07 PM" on most screens; history uses "10-06-2026 3:07:45 PM" with
  seconds (see [21](21-event-history.md) for its odd hour padding).
- History times are converted to the phone's time zone; "Date Paired" on About sensor is not
  ([19](19-sensor-location-rename-about-delete.md)).

## App life cycle

- Nothing is restored after the app is fully closed; it always starts at the Loading screen.
- While the app is in the background, the 15-second checks still tick but skip the server check;
  pairing's "waiting for hub" stage pauses its server checks until the app returns.
- There is no background work: no background fetch of events, no widgets, no watch app.

## Related

- [08 Navigation](08-navigation-and-screen-layout.md) · [20 Notifications](20-notifications.md) ·
  [11 Pairing](11-connect-hub-to-wifi.md) · [29 Environments](29-environments-and-test-builds.md)
