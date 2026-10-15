# Cartell App: Feature Parts for the React Native Port

The Flutter app (`frontend/`, version `1.12.5+193`) is split here into the parts we port to React
Native. Each part says:

- **User experience**: what the user sees, what every tap does, and the exact words on screen
- **Behind the scenes**: what the app does underneath, including every server call (what it sends
  and what it gets back)
- **Flutter source**: the files that make up the part. Paths are relative to `frontend/lib/`
  unless they start with `frontend/`. The lists come from the code's own imports.

Words in "double quotes" are the exact on-screen text, typos included. **Bold** marks button
names. "Q" numbers point at odd as-built behaviour listed in `docs/spec/19-quirks-register.md`,
which the copy reproduces.

More depth: `docs/features/` (one page per feature) and `docs/spec/` (build-level detail).

## The parts

| # | Part | What it covers |
|---|---|---|
| | **A. Across the whole app** | |
| 1 | App launch, identity and environments | Icon, name, splash, permissions, which server, the red "TEST SERVER" tag |
| 2 | Talking to the server | Request rules, maintenance check, hub-network guard, staying signed in |
| 3 | Data on the phone and in memory | Secure storage, data shapes, shared in-memory copies |
| 4 | Error reporting and logs | Sentry, error codes, developer log, Android analytics |
| 5 | Shared look | Colours, buttons, fields, switches, popups, toasts, banners, spinners |
| 6 | Navigation, screen frame, side menu and Back | Top bar, menu, tablet rail, transitions, Back on every screen |
| | **B. Getting in** | |
| 7 | App start and automatic sign-in | From tapping the icon to the first screen |
| 8 | Welcome screen, Debug Info and environment switch | Front door, version info, connection test, server picker |
| 9 | Create an account | Registration form |
| 10 | Log in | Login form, Forgot Password, password manager, biometric offer |
| 11 | Biometric unlock and lock screen | Fingerprint/Face ID gate |
| 12 | Log out | Menu → Log Out |
| 13 | Maintenance and "can't reach Cartell" | Full-screen takeover when the server is down |
| 14 | Push notifications | Permission, push token, showing alerts |
| | **C. Hubs** | |
| 15 | Hubs list (home) | All hubs and their status |
| 16 | Hub details | One hub, status, six action buttons, Open Gate |
| 17 | Hub settings | Five switches per hub, Pair Integrator |
| 18 | Rename, About and Delete hub | The hub's ⋮ menu |
| 19 | Add a hub | Name + MAC (QR or typed), Hub Added |
| 20 | Connect hub to Wi-Fi (pairing) | Six-step wizard over the hub's own Wi-Fi |
| 21 | Firmware updates | Versions, update offers, live progress |
| | **D. Sensors** | |
| 22 | Sensors list | One hub's sensors |
| 23 | Sensor details | Battery, map, history, alert switch, Pair Sounder |
| 24 | Sensor location, rename, about, delete | The sensor's ⋮ menu and sub-screens |
| 25 | Add a sensor | Three-screen pairing wizard |
| | **E. History, account and help** | |
| 26 | Event history | All / one hub / one sensor |
| 27 | Account settings | Profile rows and account-wide switches |
| 28 | Edit name, phone and password | The three edit forms |
| 29 | Delete account | Password-confirmed account removal |
| 30 | Help screen | Version, support links |
| 31 | Send feedback | Five-face rating to Sentry, the "Give Feedback" prompt |
| 32 | Alexa voice command guide | Alexa skill guide and link |
| 33 | Hub light guide | Blink patterns (developer builds) |
| | **F. Platform and tooling** | |
| 34 | Platform behaviour | Permissions, text size, rotation, keyboard, links, dates, lifecycle |
| 35 | Release tooling | Versions, signing, test/live builds, release script (developer-facing) |

---

# A. Across the whole app

## 1. App launch, identity and environments

Feature pages: [29](docs/features/29-environments-and-test-builds.md),
[32](docs/features/32-permissions-and-platform-behaviour.md) · Spec: 01, 02

### User experience
- **Identity**:
  - App name "Cartell" (iOS bundle name "cartell") and id `com.iwatllc.cartell`.
  - The same launcher icon: adaptive on Android, plus a legacy icon and the Play Store icon.
- **Launch splash**:
  - iOS: solid dark navy `#0A0E21`.
  - Android: a plain screen that follows the phone's light/dark mode (white in light mode), with
    the launcher icon in the centre on Android 12+. It turns `#0A0E21` once the app draws.
- **Rotation**: portrait and both landscapes on phones; all four orientations on iPads.
- **Red server tag**: non-live builds show a small red box in the **top-right corner** of every
  screen, inside the safe area.
  - Text is white and bold: "TEST SERVER", "BETA SERVER" or "DEVELOPMENT SERVER".
  - The box is 85% opaque, drawn above everything including popups, and never blocks taps.
  - Hidden on live builds. It changes at once when the server is switched in the Debug menu
    (Part 8).
- **Environments**:

  | Build | Server | HTTPS | Tag |
  |---|---|---|---|
  | Live (store) | `cartellap.com` | yes | none |
  | Test | `test.cartellap.com` | yes | "TEST SERVER" |
  | Beta | `beta.cartellap.com` | yes | "BETA SERVER" |
  | Development | a developer's computer, e.g. `192.168.x.x:8000` | no | "DEVELOPMENT SERVER" |
  | Simulator | `localhost:8000`, with Wi-Fi switching in pairing turned off | no | "DEVELOPMENT SERVER" |

### Behind the scenes
- **Build-time config** per environment, from `frontend/envs/*.json`:
  - `baseDomain`, `shouldUseTLS`, `sentryPublicKey`, `envIdentifier`
  - `macAddressHashKey`: different for live and test; this is how a build is told apart
  - `hubAddress` (default `192.168.4.1`), `hubPort` (`5002`), `hubReplyPort` (`6452`)
  - `skipWifiHandoff` (simulator)

  `baseDomain`, TLS and the env name can change at runtime (Debug menu). The app **refuses to
  start** if `hubAddress` is not an IPv4 address.
- **Android shell**:
  - Declared permissions: `ACCESS_FINE_LOCATION`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`,
    `CHANGE_NETWORK_STATE`, `INTERNET`. Libraries add camera, notifications, biometrics, vibration,
    wake lock and others.
  - Main activity: `singleTop`, `adjustResize`, `FragmentActivity` (for biometrics).
  - LaunchTheme/NormalTheme (AppCompat) with the window background `#FF0A0E21`.
  - minSdk 24, compileSdk 36.
  - Firebase Analytics on Android only.
  - **No** default notification channel, icon or colour in the manifest.
- **iOS shell** (Info.plist strings verbatim):
  - Face ID: "Cartell uses Face ID to unlock the app so you can check your property without typing your password."
  - Camera: "Camera permission is required for barcode scanning."
  - Local network: "Used to connect a HUB to your network."
  - Location (two keys, with a **trailing space**): "This app needs access to location information for storing and accessing locations of devices. "

  Also:
  - background modes `remote-notification` and `fetch`
  - entitlements for push, hotspot configuration, Wi-Fi info, and `webcredentials:` for
    `cartellap.com`, `test.cartellap.com` and `beta.cartellap.com`
  - LaunchScreen storyboard and AppIcon set
- **Assets shown in the app**: the logo (`cartelldigitalreverse.png`), `HUB.png`, `Sensor.png`,
  `cartell_ct6.png` (onboard probe) and `avatar.png`. Fonts: Source Sans Pro Regular, plus the icon
  fonts Font Awesome 6, Material Icons and Cupertino Icons.

### Flutter source
- `main.dart`: app root, theme, wraps the app in the env tag
- `utilities/constants.dart`: env values, `baseUrlHttp` / `baseUrlWs`, colours, `isTestBuild`
- `components/env_banner.dart`: the red server tag
- `frontend/envs/*.json`: per-environment values
- `frontend/android/`: manifest, `app/build.gradle`, styles, `launch_background.xml`, mipmaps
- `frontend/ios/Runner/`: `Info.plist`, `Runner.entitlements`, `AppDelegate.swift`,
  `LaunchScreen.storyboard`, `Assets.xcassets`
- `frontend/assets/`, `frontend/pubspec.yaml`

---

## 2. Talking to the server

Feature pages: [06](docs/features/06-session-and-log-out.md),
[07](docs/features/07-maintenance-and-no-connection.md), [A1](docs/features/A1-server-api-reference.md) · Spec: 04

### User experience
Nothing to see directly. The user notices it in four ways:
- They stay signed in for months without retyping a password.
- When the server is down, the maintenance screen appears by itself within about 15 seconds
  (Part 13).
- While the phone is on a hub's own Wi-Fi, server actions fail with "We detected you are on a HUB's
  network. Please connect to your own WiFi network and try again." Where this message is shown, if
  at all, depends on the screen.
- When the session has died, they are quietly sent to the Welcome screen. There is no "session
  expired" message, except in hub pairing.

### Behind the scenes
**Rules for every request**

| Rule | Detail |
|---|---|
| Base address | From Part 1, e.g. `https://cartellap.com` |
| Auth header | `Authorization: JWT <access token>`. The word is "JWT", not "Bearer". |
| Body | Web form (`application/x-www-form-urlencoded`), **not JSON**, including DELETE bodies. Booleans are sent as text `"true"`/`"false"`. Exceptions: `POST /echo/` (JSON) and pairing mode (`"True"`/`"False"`). |
| Timeout | 15 s. Timeouts report Sentry codes: GET `4f0ef`, POST `64773`, PATCH `a0af6`, DELETE `191d2`, user-data GET `7928a`. |
| Maintenance check | `GET /maintenance-mode/` runs **before every request** |
| Hub-network guard | Before every request, read the phone's Wi-Fi name (quotes stripped). If it matches "Cartell Hub <MAC>", refuse. Outside pairing that is a Sentry report; in pairing only a breadcrumb. If the name can't be read, the request goes through (Sentry `cbf7f`). |
| Session check | Most calls run the session check first |
| 401 | Force a session check that ignores the 60 s cache, then send the same request **once** more. Renewed → use the second answer. Unreachable → "The request timed out. Check your internet connection and try again." Refresh refused → "session expired" error. |
| Responses | JSON, read as UTF-8 |
| Paths | Exactly as listed in each part, **including the inconsistent trailing slashes** |

**Maintenance check result:**
- 200 → NORMAL
- any other status → MAINTENANCE
- no answer → UNREACHABLE

It is skipped (treated as NORMAL) while the app is in the background, during hub pairing, or while
on a hub's Wi-Fi.

**Session check** (`AuthRequestManager`):
1. Server unreachable → "offline". Nothing is deleted.
2. Confirmed less than **60 s** ago → done.
3. A check already running → wait for it (single-flight).
4. Verify the access token → valid → done.
5. No refresh token → not signed in.
6. Refresh → store **both** new tokens (the refresh token rotates).
7. Refresh refused → session dead (Sentry `66c58`).

**Background timer**: every **15 s** for the life of the app process, run the session check. Its
real job is re-checking the maintenance mode.

**Mode watcher and debouncer**:
- Normal ↔ problem mode is passed on immediately.
- Maintenance ↔ unreachable needs **two agreeing checks in a row**.
- The same mode again does nothing.
- Pairing can mark itself in progress.

| Call | Auth | Sends | Gets back | Fail code |
|---|---|---|---|---|
| `GET /maintenance-mode/` | no | — | 200 = normal | — |
| `POST /auth/jwt/verify` | no | `token` | 200 if valid | `675e0` |
| `POST /auth/jwt/refresh` | no | `refresh` | 200 `{access, refresh}` | `045c9`; dead session `66c58` |

Every other endpoint is listed in the part that uses it.

### Flutter source
- `services/request.dart`: the request library. Its parts are:
  - `services/requests/networking.dart`: `NetworkHelper`, the maintenance probe, verbs, timeouts,
    exception mapping
  - `services/requests/auth_gateway.dart`
  - `services/requests/auth_requests.dart`: `AuthRequestManager`, verify, refresh, login, register
  - `services/requests/device_requests.dart`, `services/requests/user_requests.dart`,
    `services/requests/event_requests.dart`, `services/requests/sensor_requests.dart`,
    `services/requests/firmware_requests.dart`,
    `services/requests/firmware_update_requests.dart`,
    `services/requests/location_requests.dart`: endpoint functions, used by later parts
- `services/requests/authorized_requester.dart`: 401 → refresh → retry once
- `services/requests/hub_network_name_check.dart`: the "on a hub's Wi-Fi" guard
- `services/requests/exceptions.dart`: request exceptions (offline, auth expired)
- `services/requests/settings_requests.dart`: `getSetting` (`/app/settings/`)
- `utilities/AppWatchers/mode_watcher.dart`, `utilities/AppWatchers/mode_debouncer.dart`
- `utilities/start_services.dart`: the 15 s background session timer, cache start-up
- `services/enums/result.dart`: `Result` / `ResultOf` statuses and messages
- `utilities/Exceptions/Exceptions.dart` and its parts `utilities/Exceptions/AccountExceptions.dart`,
  `utilities/Exceptions/HubExceptions.dart`, `utilities/Exceptions/NetworkExceptions.dart`,
  `utilities/Exceptions/ProfileExceptions.dart`, `utilities/Exceptions/SettingsExceptions.dart`

---

## 3. Data on the phone and in memory

Feature page: [A2](docs/features/A2-data-kept-on-the-phone.md) · Spec: 03 §4, 05

### User experience
- Only sign-in keys and a few settings survive closing the app. Hubs, sensors, events and account
  details live in memory and are reloaded on every launch. Nothing works offline.
- Every screen showing the same hub or sensor updates together when any screen downloads newer data.
- A user who updates from the Flutter app to the RN app stays signed in, keeps their biometric
  setting, and keeps receiving notifications.
- On iOS, Keychain items can survive an uninstall, so a reinstall may sign straight in.

### Behind the scenes
**Secure storage** (iOS Keychain / Android Keystore-encrypted storage). Every key starts with the
environment name (`LIVE_`, `TEST_`, `BETA_`, `DEVELOPMENT_`), so each server keeps its own set.

| Key | Holds | Written | Deleted |
|---|---|---|---|
| `<ENV>_access` | access token | login, every renewal | log out, delete account |
| `<ENV>_refresh` | refresh token (~180 days, rotates) | login, every renewal | log out, delete account |
| `<ENV>_fcmToken` | push token | start-up, login, token refresh | log out, debug env switch |
| `<ENV>_biometricsEnabled` | `"true"` / `"false"` / absent = never asked | login offer, Account settings, auto-clear | log out, delete account |
| `<ENV>_feedbackToken` | show the "Give Feedback" prompt (absent = false) | debug "Reset Show Feedback", "No thanks" | never |
| `<ENV>_userName` | unused | never | never |

- An empty stored value is treated as "nothing stored".
- Legacy keys `<ENV>_email`, `<ENV>_password` and `<ENV>_false` are purged at every start-up,
  login, log out, password change and account delete.
- The password itself is never stored.
- **Flutter format** to read after the update: iOS keychain service `flutter_secure_storage_service`
  with account = key; Android encrypted SharedPreferences `FlutterSecureStorage`, decrypted with
  keystore key `com.iwatllc.cartell.FlutterSecureStoragePluginKey` (spec 03 §4).

**Data shapes read from the server** (manual JSON parsing):

| Model | Fields |
|---|---|
| Hub (`Device`) | `id`, `name`, `location`, `latitude`, `longitude`, `archived`, `archived_date`, `added_date` (required), `should_use_onboard_sensor`, `should_send_notification`, `should_send_connection_notification` (required, not null), `should_send_email`, `should_use_emulated_sensor`, and `device` → `{id, is_connected, mac_address, esp32_app_version, rfm6601_app_version, is_blacklisted, device_model {name, release_date}, connections [{ip_address, port, is_active, connection_date, disconnection_date}], sensors [...]}` |
| Sensor | `id`, `sensor_id`, `name`, `latitude`, `longitude` (text), `has_low_battery`, `is_active`, `connection_date` (required), `disconnection_date`, `should_send_notification`, `fw_version`, `sensor_type` (`"ON"` = onboard), `is_blacklisted` |
| Event page | `{count, next, previous, results}`; each result `id`, `device`, `device_name`, `sensor`, `sensor_name`, `event_type` (`AC`/`CO`/`DC`), `time`, `location`, `added_date` |
| User | `id`, `email`, `first_name`, `last_name`, `phone_no`, `should_send_emails` |
| Profile | `user`, `should_send_notification`, `locations [{id, name, devices}]`, `alexa_enabled` |
| Location | `id`, `name`, `devices` |
| Firmware | `id`, `version_number`, `release_date`, `stable`, `supported`, `processor` |
| Firmware update | `id`, `status`, `file_size`, `file_cursor`, `message`, `date_started`, `date_ended`, `firmware` |
| Setting | `id`, `key`, `value` |

**In-memory cache** (`DataPersistor`): one shared object per hub, sensor, user, location and
firmware. New data is merged into the existing object, and listening screens rebuild.

Some fields are **not** refreshed during a session (Q19): a hub's `should_use_emulated_sensor`,
location and added date, and a sensor's `is_blacklisted`.

### Flutter source
- `services/secure_storage.dart`: keys, env prefix, empty → null, biometric three-state, legacy purge
- `services/data/data_persistor.dart`: the shared in-memory cache
- `models/models.dart` and its parts `models/abstract_model.dart`, `models/json_parser.dart`,
  `models/device.dart`, `models/device_model.dart`, `models/connection.dart`, `models/sensor.dart`,
  `models/event.dart`, `models/user.dart`, `models/profile.dart`, `models/location.dart`,
  `models/firmware.dart`, `models/firmware_update_model.dart`, `models/setting_model.dart`
- `utilities/Exceptions/json_parsing_exceptions.dart`, `utilities/Exceptions/model_exceptions.dart`

---

## 4. Error reporting and logs

Feature page: [31](docs/features/31-error-reporting-and-logging.md) · Spec: 03 §1–§2

### User experience
- Invisible to users, except:
  - pairing error codes and the firmware "Reference" number, which are shown on screen
  - feedback (Part 31), which is sent with the user's name and email
- Error reports are **not** linked to the user (Q44).

### Behind the scenes
- **Sentry setup**:
  - DSN from the env.
  - Environment tag LIVE/TEST/BETA/DEVELOPMENT; release `com.iwatllc.cartell@<version>+<build>`.
  - Performance traces and profiles at 20% in release, 100% in debug; compressed payloads.
  - App-hang tracking; stack traces and threads attached.
  - `sendDefaultPii = false`; debug logging in dev.
  - Screenshots attached with **all text and images masked**; the QR camera preview is masked.
  - `beforeSend` replaces the `authorization` and `cookie` headers with "[Filtered]".
- **Coded reports**: almost every failed request sends "Error Code xxxxx:" (events use "Error
  Message xxxxx:"). Each part lists its codes; the full table is in feature page 31. Pairing adds
  breadcrumbs and a summary message per waiting phase (Part 20).
- **Developer log**: `MM/dd/yyyy HH:mm:ss.SSS - <name> - LEVEL - message`. Info and up in debug
  builds, warning and up in release, with allow/deny lists by logger name. Nothing is sent
  anywhere.
- **Firebase Analytics**: Android only, automatic events, no custom events. None on iOS.

### Flutter source
- `main.dart`: `SentryFlutter.init` options, `beforeSend`
- `utilities/logging.dart`: logger format and levels
- `utilities/constants.dart`: log allow/deny lists
- `frontend/android/app/build.gradle`: `firebase-analytics-ktx`

---

## 5. Shared look

Feature page: [30](docs/features/30-popups-toasts-and-banners.md) · Spec: 07

### User experience
**Colours**

| Name | Hex | Used for |
|---|---|---|
| Night Ground | `#0A0E21` | screen background |
| Asphalt | `#25282A` | app bar, popups |
| Dusk Blue | `#6787B7` | blue buttons, icons |
| Signal Amber | `#FFB500` | amber buttons, field outlines, switches |
| Deep Gravel | `#54585A` | toasts, drawer, disabled glyphs |
| Gravel | `#A2AAAD` | disabled buttons |
| Surface Card | `#1D1E33` | cards |
| Surface Sunken | `#111328` | inactive cards |
| Alert Red | `#FF5252` | password rules, errors |
| Status Green | `#69F0AE` | success |

**Text**: white, 14 px on a 20 px line, letter-spacing 0.25 (Material 3 body). Roboto on Android,
San Francisco on iOS. Source Sans Pro for the "Hubs" and "Sensors" headings.

**Buttons**
- **Rounded button**: pill shape, raised, 45 px tall, at least 200 px wide. Turns Gravel grey when
  disabled.
- **Rounded loader**: a 350 px amber bar with a white spinner (Add hub Submit).
- **Stock Material 3 buttons**: icon buttons, text buttons, and the lavender default button (used
  on "Open Debug Info" and **Retry**).
- **Round amber + button**: bottom-right, 16 px corner radius.
- **Back button on auth screens**: a transparent round ← top-left.

**Text fields**
- Rounded amber outline: 1 px, 2 px when focused.
- Label inside, floating up on typing; hint text.
- Red error text under the field and a red border on error.
- Eye button to show/hide passwords.
- Character counter where there is a limit.
- One field (the pairing Wi-Fi password) has a plain underline instead.
- MAC fields fill as `XX:XX:XX:XX:XX:XX` (hex only, upper case, colons added).

**Switches**: Material 3 style, amber when on. "Auto" switches flip at once, save, and on failure
flip back and show a toast.

**Popup** (the main dialog)
- A `#25282A` rounded box in the middle of a dimmed screen.
- Top to bottom: amber icon ("!" in a circle by default; some use ✓ or another icon), bold white
  title, grey message, optional extra (a text field, a list of checks), buttons.
- **One button**: a blue pill, "Okay" unless renamed.
- **Two buttons**: grey pill left ("Cancel" unless renamed), blue pill right ("Okay" unless
  renamed).
- **Tapping outside does not close it; Android Back does.** It stays until a button is pressed.
- An unknown message type shows "Whoops" / "I'm not sure what this is. Sorry!"

**Firmware dialog**: the plain Material 3 alert: dark, title, message, one amber **OK** text
button. Tapping outside closes it.

**Toast**
- A flat `#54585A` bar that fades in at the **top centre**, 50 px from the top, with a white icon
  and white text.
- Lasts **5 s**; swipe to dismiss. A new toast removes the current one first.
- Icons: ✓ (success) or "!" (failure).
- Two feedback toasts are black (Part 31).

**Top banner** (Pair Sounder only)
- A grey rounded box (screen width − 40 px, about 1/9 of the screen tall) that slides/fades in at
  the top with a white ✓.
- Closes after **4 s** and **blocks taps** meanwhile.

**Bottom panel**: slides up from the bottom; tapping above it closes it (Debug Info, Feedback).

**⋮ menus**: a small dark menu next to the button. Destructive items are red.

**Form overlay**: a dimmed layer with a spinner over a form while it sends (Login, Register,
Change password). The form stays visible; buttons are disabled.

**Spinners**: Material circular and linear progress, a white ring, a pulsing circle and a
fading-four spinner.

**Liquid pull-to-refresh**: drag down and an amber "liquid drop" on `#25282A` (40 px) appears;
the reload starts after a fixed **2 s** wait.

**Hub light**: a 45 px circle with a white rim, dark grey between flashes, showing one of 7 blink
patterns (Part 33). The screen reader announces its name. With "reduce motion" on it shows its
first colour steadily.

**Status glyph** (hubs): a tower icon with a ✓/✗ badge and a status line (Part 16).

**Red badge**: a red circle dot on a card or button corner (flagged sensors).

**Friendly error view**: an orange "!" and one of:
- "Something went wrong. Please try again."
- "Your session has expired. Please sign in again."
- "We couldn't load your account information. Please try again."

**Display pieces**:
- label/value rows that stack at large text
- dark cards
- listing rows (icon, label, value)
- the three-button row
- expandable info rows

### Behind the scenes
- Popups raised by sign-in, registration and log-out go through one central stream (`drawMessage`)
  and appear over whatever screen is current.
- Pull-to-refresh calls the screen's refresh only after its 2 s wait.

### Flutter source
- `components/forms/rounded_button.dart`, `components/rounded_loader.dart`
- `components/forms/auto_switch.dart` (`AutoSwitch`, `SynchronizedAutoSwitch`)
- `components/forms/text_field_with_post_change_validators.dart`
- `components/popups.dart`: `showPopupMessage`, `showToastPopup`
- `components/teast_popups.dart`: the top banner
- `components/errors/popup_dialog.dart`, `components/errors/popup_error.dart`,
  `components/errors/popup_notification.dart`, `components/errors/rendered_message.dart`
- `utilities/bloc_popups.dart`: `drawMessage`, "Whoops"
- `components/friendly_error_view.dart`, `components/conditional_view_widget.dart`
- `components/hub_light_widget.dart`, `components/hub_status_glyph.dart`
- `components/timed_pull_to_refresh.dart`
- `components/key_value_pair_display.dart`, `components/reusable_card.dart`,
  `components/reusable_listing.dart`, `components/responsive_spacer.dart`
- `components/three_button_rows/three_button_row.dart`,
  `components/three_button_rows/icon_button_row_entry.dart`
- `components/forms/additional_info_field.dart`
- `utilities/constants.dart`: colours, `kTextFieldDecoration`, text styles
- `utilities/scaling.dart`: `getScalingFactor`, `bigFont`, `isBigFont`, full-screen button width

---

## 6. Navigation, screen frame, side menu and Back

Feature page: [08](docs/features/08-navigation-and-screen-layout.md) · Spec: 06

### User experience
**Top bar** (signed-in screens):
- `#25282A`, 56 px, white Cartell logo.
- ☰ on the left on screens 800 px wide or less.
- On the right, depending on the screen: ⋮ menu, **X**, an invisible spacer, or nothing. Because
  of this the logo is not exactly centred on every screen.

**Side menu** (drawer): opened by ☰ or swiping in from the left edge; closed by tapping outside,
swiping away, or Back. Grey background.
- **Header**: round generic avatar, "First Last", and the email. The email is hidden at large text
  (about 1.4×).
- If the user isn't loaded, only "Unable to get current user. Please restart the app and try
  again." is shown.
- Items, each with an icon, separated by lines:

  | Item | Icon | Goes to |
  |---|---|---|
  | Account Settings | person | Part 27 |
  | Event History | clock with arrow | Part 26 |
  | HUBs | satellite dish | Part 15 |
  | Help | headset | Part 30 |
  | Log Out | door with arrow | Part 12 |

- Tapping an item closes the menu first, then opens the destination. **HUBs** from inside a hub or
  sensor screen returns to the Hubs list.

**Wide screens** (more than 800 px): the menu is a permanent rail on the left, there is no ☰, and
content sits to its right.

**Screens with no menu**: pairing, firmware progress, Hub Added, and every signed-out screen
(Loading, Welcome, Login, Register, Lock, Maintenance).

**Transitions**:
- Screens **cross-fade over 300 ms**; both are visible during the fade.
- Pairing steps change **instantly**.
- A screen refreshing in place has no transition.
- The QR scanner and the pairing failure page slide in like normal pages (Cupertino slide on iOS).

**Android Back**:

| Screen | Back does |
|---|---|
| Loading, Welcome, Login, Register, Lock, Maintenance | closes the app (moves it to the background) |
| Hubs list | popup "Leave App" / "Are you sure you want to leave this app?" with **Nevermind** / **Leave**. Leave closes the app on Android and does nothing on iOS. |
| Account settings, All event history, Help, Hub details, Add hub | Hubs list |
| Edit name, Edit phone | Account settings |
| Edit password | Account settings (ignored while saving) |
| Alexa guide, Hub light guide | **nothing** (Q28) |
| Hub settings, About hub, Rename hub, Hub history, Sensors list, Firmware | Hub details |
| Firmware progress | leaves the progress screen |
| Sensor details | Sensors list |
| About sensor, Rename sensor, Edit coordinates, Sensor history | Sensor details |
| Add-sensor steps 1–3 | Sensors list |
| Hub Added | Hub details |
| Pairing | early steps: Hubs list; mid-pairing: "Stop Pairing?" first |
| In-app loading screens | nothing |
| A popup / bottom panel / the QR scanner | closes it |

**iOS**: no system Back. Edge-swipe back only works on pushed pages (the QR scanner); every other
screen uses its on-screen ← / X.

**Help screen** (Q29): **X** goes back one screen; ← and Back go to the Hubs list.

### Behind the scenes
- There is no page stack. Three nested state machines decide what is on screen:
  - **Auth**: signed-out screens, Loading, Lock, Maintenance, or the main app
  - **MainApp**: account, history, help, Alexa, hub lights, or the hubs area
  - **Devices**: everything about hubs and sensors

  A new Devices machine is created each time the hubs area is shown.
- **`GenericBloc`** (shared engine):
  - event handlers run **concurrently**
  - a state equal to the current one is not re-emitted
  - a small back-stack of earlier states: non-poppable states are kept off it, and a state of the
    same type replaces the top
  - `popState(n)` pops n+1 and re-emits (used by "go back N")
  - a fallback state
  - an error hook
- **`emitThenRefresh`**: show the cached screen with "checking", then revalidate → "ready" or
  "failed". It won't overwrite a screen the user has already left, and an expired session is
  passed up.
- **Error recovery**:
  - MainApp screens: force a session check; dead → auto-login (lands on Welcome), else Hubs list.
  - Devices screens: force a session check; dead → auto-login, else retry loading the Hubs list
    after 1, 2, then 3 s, and give up after 3 failures (the counter resets on success).
- An unknown state throws.

### Flutter source
- `bloc/shared/generic_bloc.dart` and its parts `bloc/shared/bloc.dart`, `bloc/shared/events.dart`,
  `bloc/shared/states.dart`
- `utilities/object_stack.dart`: the back-stack
- `bloc/auth/auth_bloc.dart` and its parts `bloc/auth/bloc.dart`, `bloc/auth/event.dart`,
  `bloc/auth/state.dart` (events are listed under Parts 7–13)
- `bloc/main_app/main_app_bloc.dart` and its parts `bloc/main_app/bloc.dart`,
  `bloc/main_app/event.dart`, `bloc/main_app/state.dart`,
  `bloc/main_app/events/go_back_n_states_event.dart`,
  `bloc/main_app/events/go_to_hubs_screen_event.dart`
- `bloc/devices/devices_bloc.dart` and its parts `bloc/devices/bloc.dart`,
  `bloc/devices/event.dart`, `bloc/devices/state.dart`,
  `bloc/devices/events/go_back_n_states_event.dart`
- `screens/bloc_widgets/auth_bloc_widget.dart`: Auth state → screen, mode listener, popups
- `screens/bloc_widgets/main_app_bloc_widget.dart`: MainApp state → screen
- `screens/bloc_widgets/devices_bloc_widget.dart`: Devices state → screen, recovery backoff
- `components/app_scaffold.dart`: top bar, drawer vs rail, `showNavigation`
- `components/navbar.dart`: the side menu

---

# B. Getting in

## 7. App start and automatic sign-in

Feature page: [01](docs/features/01-app-start-and-automatic-sign-in.md) · Spec: 08 §1, §3

### User experience
- Tap the icon → splash (Part 1) → **Loading screen**: the logo bar and a white spinning ring;
  nothing can be tapped.
- Then exactly one of:
  - **Hubs list**: signed-in user
  - **Welcome**: signed out, or sign-in failed
  - **Lock screen**: biometric unlock on and the check failed (Part 11)
  - **Maintenance / can't reach**: the server is down (Part 13)
- On a fresh install, a signed-in user also sees the notification permission prompt during this
  sequence.
- The app never returns to the screen the user was on before it closed. It always starts here.
- Opening from a notification is identical to opening from the icon.

### Behind the scenes
**Start-up** (once per launch, in order):
1. Log the settings (env, server, TLS, Sentry key present, hub address).
2. Refuse to start on a non-IPv4 hub address.
3. Start Sentry.
4. Create the in-memory cache.
5. Start the 15 s session timer.
6. Start Firebase and the notification listeners.
7. Draw the Loading screen.

**Auto-login** (runs when the Auth machine is created):
1. Show Loading.
2. Purge legacy credential keys. This never blocks.
3. No access token → **Welcome**.
4. Biometric gate, if enabled (Part 11).
5. Up to **3 attempts**, each doing all of:
   1. session check (failure → "Failed to authenticate")
   2. ask for notification permission (not awaited)
   3. get the Firebase token, store it if changed, **always** register it
   4. `GET /devices/`, then `get_health` for every **connected** hub
   5. `GET /auth/users/me/`
6. All 3 fail → **Welcome**. Tokens are kept.
7. Success → create MainApp → `GET /devices/` → **Hubs list**.
8. Anything thrown → **Welcome**.

Auto-login runs again on **Unlock** (Lock screen), when the server comes back from maintenance, and
when a screen finds the session dead.

| # | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| 1 | `POST /auth/jwt/verify` | `token` | 200 if valid | `675e0` |
| 2 | `POST /auth/jwt/refresh` (if 1 failed) | `refresh` | `{access, refresh}` | `045c9` / `66c58` |
| 3 | `POST /notifications/register_device/` | `token`, `device_name` (e.g. "Pixel 7"), `platform` (`Android`/`iOS`) | anything (logged) | `938dc` |
| 4 | `GET /devices/` | — | list of hubs | `befba` |
| 5 | `POST /devices/{id}/message/get_health/` (each connected hub) | empty | < 300 (failure only reported) | `70a42` |
| 6 | `GET /auth/users/me/` | — | user | `e6196` / `15955` |
| 7 | `GET /devices/` | — | list of hubs for the Hubs screen | `befba` |

Each call is preceded by `GET /maintenance-mode/`. So the hub list is fetched twice here, and a
third time when the Hubs screen opens.

`get_health` does not return health. It asks the server to message the hub over the hub's live
connection, so the hub reports in fresh.

**Odd but true**:
- Unreachable during start-up: the "can't reach" screen and the sign-in attempts run side by side.
  When the attempts give up, Welcome replaces it.
- A failed sign-in keeps the tokens, so the next launch with internet signs straight in.

### Flutter source
- `main.dart`: start-up order
- `utilities/start_services.dart`: cache, 15 s timer
- `utilities/notifications.dart`: Firebase start-up
- `bloc/auth/events/auto_login_event.dart`
- `services/auth_manager/check_creds.dart`: `autoLoginMethodOnTheLoadScreen`, `validateFCMToken`,
  `sendFCMToken`, `queryAllHubsHealth`
- `screens/welcome/load_screen.dart`: the Loading screen (also used inside the app)
- `screens/bloc_widgets/auth_bloc_widget.dart`

---

## 8. Welcome screen, Debug Info and environment switch

Feature pages: [02](docs/features/02-welcome-screen-and-debug-info.md),
[29](docs/features/29-environments-and-test-builds.md) · Spec: 08 §2, 02 §5

### User experience
**Welcome screen**: no top bar, dark navy background. Centred, top to bottom:
1. the white Cartell logo
2. **Log In** (blue, "enter" arrow icon) → Part 10
3. **Register** (amber, clipboard icon) → Part 9
4. **Open Debug Info**: a small rounded button in the stock lavender-on-grey style, the only
   lavender element in the app (Q41)

Layout details:
- Side margins are 10% of the width, or 20% at 800 px and wider.
- Vertical gaps are computed from the screen height in **physical pixels**, so they differ between
  phones of different pixel density (Q20).
- Android Back closes the app.

**Debug Info panel**: a grey bottom panel 30% of the screen height in *physical pixels* tall (about
90% of the screen on a 3× phone, Q20); tap outside to close. It
shows:
- "Version: 1.12.5"
- "Build Number: 193"
- "Environment Name: LIVE" (or TEST, BETA, DEVELOPMENT), on every build including the store build
- **Test Connection** (amber)
- **Verify Sentry Setup** and **Reset Show Feedback**: developer builds only
- **Change Environment**: only builds not made for production
- **Close** (blue)

**Test Connection**: the standard popup with the amber "!" icon, an empty title and message, four
rows, and one **Okay**. Each row starts with a spinner and turns ✓ or ✗; each waits 1 s, then has
15 s.

| Row | Check | Passes when |
|---|---|---|
| "Internet Access" | `GET https://google.com` | 200 |
| "Server Access" | `GET /test/` | 200 |
| "Can Reach Spash Page" (typo kept, Q36) | `GET /` (server home page) | 200 |
| "Can Post to Server" | `POST /echo/`, JSON body `{"msg":"this is a test"}` | 200 and `msg` echoed back unchanged |

A row that times out or hits a network error **spins forever** (Q33). Only a clean non-200 shows ✗.

**Verify Sentry Setup** deliberately throws "This is a test exception" (nothing visible on screen).
**Reset Show Feedback** turns the feedback flag on (Part 31).

**Change Environment** switches the panel to:
- "Switch Environment" (bold)
- amber warning "Warning: When using Beta or Production environments, pairing new hubs to the
  server will not work."
- three rounded boxes with radio icons:
  - **Beta** — `beta.cartellap.com`
  - **Test** — `test.cartellap.com`
  - **Production** — `cartellap.com`

  The current one is highlighted blue with a ✓.
- **Back** (blue) returns to the info view.

Choosing one:
1. switches the server (always HTTPS)
2. changes the environment name and the red tag (Production hides it)
3. deletes that environment's stored push token
4. returns to the info view, which shows the new name

The user then logs in on the new server. Each environment keeps its own sign-in on the phone.

**Odd but true**:
- The switch is **not saved**; reopening the app returns to the built-in server (Q9).
- **Change Environment** visibility is decided at start-up, so a test build switched to Production
  still shows it (Q9).
- Tapping **Open Debug Info** in the first instant after the screen appears, before the version has
  been read, fails silently with a Sentry report.

### Behind the scenes
- Version and build come from the phone's package info.
- The Test Connection calls skip the maintenance check and the auth header. They are the only calls
  in the app that do.
- The 15 s timer keeps running here, so the maintenance screen can take over the Welcome screen too.

### Flutter source
- `screens/welcome/welcome_screen.dart`: Welcome, the connection-test popup
- `screens/misc/debug_menu.dart`: Debug Info panel, environment picker
- `bloc/auth/events/go_to_welcome_screen_event.dart`
- `utilities/constants.dart`: mutable `baseDomain` / TLS / env name, `isTestBuild`
- `services/secure_storage.dart`: push token delete on switch, feedback flag

---

## 9. Create an account

Feature page: [03](docs/features/03-create-an-account.md) · Spec: 08 §6, §9

### User experience
No top bar; a round **←** floats top-left. The form is centred, at most 500 px wide:
1. small logo
2. **"Create Account"** (large, bold)
3. "Create a new account to get started with your Cartell alert system!"
4. **First Name** (person icon) and **Last Name** (no icon), side by side
5. **Email** (envelope icon, email keyboard)
6. **Password** (padlock icon, hidden text, eye button)
7. **Confirm Password**: appears only once the password passes every rule
8. **Phone Number** (phone icon, phone keypad)
9. **Register** (blue)
10. "Already have an account?" + amber "Login Here"

All fields have rounded amber outlines with labels inside.

**Live checks**
- **Email**, on every keystroke: needs "@" and "." and at least 5 characters, else the field turns
  red with "Please enter a valid email".
- **Password**, on every keystroke: every failing rule is listed in red (`#FF5252`), one per line:
  - "Password field cannot be empty" (only this one when empty)
  - "Password must contain at least one uppercase letter"
  - "Password must contain at least one number"
  - "Password must contain at least one special character" (from `!@#$%^&*(),.?":{}|<>`)
  - "Password must be at least 8 characters long"
- While any rule fails, Confirm Password is hidden **and wiped**.
- Names and phone are not checked.
- **Register is never disabled**.

**Tapping Register**: a dimmed overlay with a spinner covers the form; Register and ← are disabled;
the form stays underneath.

| Result | What the user sees |
|---|---|
| Passwords differ (including Confirm never shown, so empty) | "Unable to Create Account" / "Passwords do not match. Please re-enter them and try again." |
| Created (201) | Password manager "Save password?" offer, then a ✓ popup with the large title "Your account was created. Please login" and the small text "Registration Succeeded" (swapped, Q3), then the **Login** screen with the email filled in |
| Rejected (300–499) | "Unable to Create Account" with the server's messages for the **first** problem field found, in order email, password, first name, last name, phone. Each message is on its own line starting with a newline and a space. If no known field: "An error occurred. Please try again." |
| Other status | "Unable to Create Account" / "Something went wrong on our end. Please try again in a moment." |
| Timeout / other app error | Large title "Request timed out. Check your internet connection, and then try again.", small text "An Error Occured" (swapped, typo kept) |
| No network at all | **The spinner stays up** (Q4) until the "can't reach" screen takes over |

After any failure the form returns with first name, last name, email and phone kept.

**Leaving**: ← → Welcome; "Login Here" → Login. In both cases the password manager is told not to
save. Android Back closes the app. Registering does **not** sign the user in.

### Behind the scenes

| Call | Auth | Sends | Gets back | Fail code |
|---|---|---|---|---|
| `POST /auth/users/` | no | `email`, `first_name`, `last_name`, `password`, `phone_no` (`""` if empty) | **201**; 4xx JSON `{field: [messages]}` | `5c9f3` (then returns null, which causes Q4) |

### Flutter source
- `screens/welcome/registration_screen.dart`
- `bloc/auth/events/attempt_registration_event.dart`
- `bloc/auth/events/go_to_registration_screen_event.dart`
- `services/requests/auth_requests.dart`: `register`

---

## 10. Log in

Feature page: [04](docs/features/04-log-in.md) · Spec: 08 §5, §9, 09 §6

### User experience
No top bar; round **←** top-left. Centred:
1. Cartell logo, **hidden while the keyboard is open**
2. **Email** ("Enter your email", email keyboard; "next" moves to password)
3. **Password** ("Enter your password", hidden; eye button labelled "Show password" / "Hide
   password"; "done" logs in)
4. **Forgot Password**: amber, right-aligned
5. **Log In** (blue)
6. "Don't have an account?" + amber "Create One Here"

The email is pre-filled when coming from Registration.

**Taps**

| The user… | What happens |
|---|---|
| taps **Log In** with an empty field | red "Email field cannot be empty" / "Password field cannot be empty"; nothing sent; the message clears when they type in that field |
| taps **Forgot Password** | `<server>/password_reset` opens in a browser panel **inside** the app (Chrome Custom Tab / Safari view) |
| taps "Create One Here" | Registration |
| taps **←** | Welcome |
| presses Android Back | the app closes |
| taps a field | the phone may offer saved Cartell passwords |

**Login attempt**: a dimmed overlay with a spinner; Log In and ← are disabled; the form stays
mounted underneath.

| Result | What the user sees |
|---|---|
| 401 | "Account Not Found" / "Please check your credentials and try again." The email and password stay as typed. |
| Other status ≥ 300, network error, or any error in the success steps | "An Error Occured" / "An error occured. Please try again. If problem persists, contact support" (typos kept, Q35). The Login screen comes back. |
| Success | see below |

**On success**:
1. "Save password?" offer from the phone. This is the **only** time the app asks the password
   manager to save.
2. Notification permission prompt, if not granted yet.
3. **Biometric offer**, once per phone, only if never asked and the phone has a fingerprint or face
   enrolled: "Unlock with biometrics?" / "Use your fingerprint or face to open Cartell instead of
   typing your password. You can change this later in Account Settings." with **Cancel** and
   **Okay**. Okay turns it on.
4. The **Hubs list** opens; the biometric popup stays on top of it.

### Behind the scenes
**Success steps**:
1. Commit autofill.
2. Store the access and refresh tokens and purge legacy keys.
3. Notification permission.
4. Push token: validate the stored one. If Firebase has a newer token, store it and send it. If the
   stored one is valid, send it. Otherwise get one, store it and send it.
5. `GET /auth/users/me/`.
6. Biometric offer: write **"off" before showing** the popup, so it never repeats.
7. `GET /devices/` → Hubs.

The password is never stored by the app. iOS autofill save only works against the three real
Cartell domains.

| # | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| 1 | `POST /auth/jwt/create` (no auth) | `email`, `password` | 200 `{access, refresh}`; 401 bad credentials | `11dd3` |
| 2 | `POST /notifications/register_device/validate/` | `token` | `{"valid": true/false}` | — |
| 3 | `POST /notifications/register_device/` | `token`, `device_name`, `platform` | anything | `938dc` |
| 4 | `GET /auth/users/me/` | — | user | `e6196` / `15955` |
| 5 | `GET /devices/` | — | hubs | `befba` |

### Flutter source
- `screens/welcome/login_screen.dart`
- `bloc/auth/events/attempt_logging_in_event.dart`: login flow, biometric offer
- `bloc/auth/events/go_to_login_screen_event.dart`
- `services/auth_manager/check_creds.dart`: `successfulLoginStartup`, `getFCMToken`,
  `validateToken`, `fullLogin`
- `services/requests/auth_requests.dart`: `login`

---

## 11. Biometric unlock and lock screen

Feature page: [05](docs/features/05-biometric-unlock.md) · Spec: 03 §5, 08 §3–§4

### User experience
- **Setting states** (per server): never asked / off / on.
  - Offered once after login (Part 10).
  - Switched in Account settings (Part 27).
  - Reset to "never asked" on log out and on delete account.
- **At app start, when on**: the phone's own prompt appears with the reason **"Unlock Cartell"**.
  Android shows BiometricPrompt with a PIN/pattern/password option; iOS shows Face ID / Touch ID
  with a passcode fallback.

  | Result | Then |
  |---|---|
  | Recognised (or correct PIN) | sign-in continues to the Hubs list |
  | Phone no longer has biometrics or a passcode | the setting is quietly switched **off** and sign-in continues |
  | Too many attempts | **Lock screen** with "Too many attempts. Use your password to sign in instead." |
  | Cancelled / not recognised | **Lock screen**, no message |

- **Lock screen** (no top bar, centred):
  1. large logo
  2. grey fingerprint icon
  3. "Cartell is locked"
  4. the grey lockout line, only after a lockout
  5. **Unlock** (blue, fingerprint icon): reruns the whole automatic sign-in, including the prompt
  6. amber "Use password instead" → Login. A password login leaves the setting as it was.

  Android Back closes the app.

### Behind the scenes
- Available = the device supports biometrics **and** has one enrolled.
- The prompt uses `biometricOnly: false` (device credential allowed) and sticky auth.
- The gate runs after the access-token check and **before** any network work in auto-login.
- No server calls. Stored in `<ENV>_biometricsEnabled`.

### Flutter source
- `services/biometric_service.dart`: availability, prompt, outcome mapping
- `screens/welcome/lock_screen.dart`
- `bloc/auth/events/auto_login_event.dart`: the gate
- `services/secure_storage.dart`: the three-state preference

---

## 12. Log out

Feature page: [06](docs/features/06-session-and-log-out.md) · Spec: 08 §8

### User experience
1. Side menu → **Log Out**. The menu closes, then "Log Out" / "Are you sure you want to log out?"
   with **Cancel** and **Okay**.
2. **Cancel** closes the popup.
3. **Okay** closes the popup at once. A moment later the **Welcome** screen appears.
4. If clearing the session fails: "Could Not Sign Out" / "Your session could not be cleared. Please
   try again." and the user stays signed in.

### Behind the scenes
1. Read the stored push token. If there is one, unregister it on the server. Then Firebase
   `deleteToken`. Failures are logged and ignored.
2. Delete the **refresh** token, then the **access** token. This order is on purpose: a leftover
   access token can't be renewed.
3. Best effort: delete the stored push token, the legacy keys and the biometric setting.
4. Go to Welcome.

Nothing asks the server to revoke the tokens. Cached hubs and user stay in memory until the app
closes.

| Call | Sends | Gets back |
|---|---|---|
| `DELETE /notifications/register_device/` (form body on DELETE) | `token` | ignored; skipped if no token |

### Flutter source
- `bloc/auth/events/attempt_log_out_event.dart`
- `components/navbar.dart`: the Log Out item and the confirm popup
- `services/requests/user_requests.dart`: `deleteMessagingData`
- `services/secure_storage.dart`

---

## 13. Maintenance and "can't reach Cartell"

Feature page: [07](docs/features/07-maintenance-and-no-connection.md) · Spec: 08 §7

### User experience
- When the server is in maintenance or unreachable, this screen **replaces whatever is on screen**
  (300 ms cross-fade). What the user was doing is abandoned. This applies to any screen, including
  Welcome, Login and Register.
- The logo bar stays, with no menu. Centred:

  | | Maintenance | Unreachable |
  |---|---|---|
  | Icon (large) | wrench | Wi-Fi |
  | Text | "The server is currently undergoing an update. Please check back later." | "We can't reach Cartell right now." (new line) "Check your internet connection and try again." |

  Below it, **Retry**: a stock lavender text button, greyed out while it checks.
- **Retry** while still down → nothing visible changes.
- **Server back** (Retry or the 15 s timer) → the **automatic sign-in runs from the start**
  (Loading, biometric prompt, health checks), then the Hubs list, or Welcome if signed out.
  Anything typed is lost.
- Android Back closes the app.

### Behind the scenes
- The mode comes from Part 2 (maintenance check plus debouncer).
- The Auth machine listens for mode changes and shows this screen, or reruns auto-login on return to
  NORMAL.
- Retry calls `GET /maintenance-mode/` directly.

### Flutter source
- `screens/welcome/maintenance_mode_screen.dart`
- `bloc/auth/events/maintenance_mode_event.dart`
- `screens/bloc_widgets/auth_bloc_widget.dart`: mode listener → debouncer → event
- `utilities/AppWatchers/mode_watcher.dart`, `utilities/AppWatchers/mode_debouncer.dart`

---

## 14. Push notifications

Feature page: [20](docs/features/20-notifications.md) · Spec: 09

### User experience
- **Which alerts arrive** is decided by the server from six switches: account push and account email
  (Part 27); hub push, hub connection and hub email (Part 17); sensor push (Part 23).
- **How they look**:

  | App state | What appears |
  |---|---|
  | Closed / background | A normal system notification with the server's title and text, the Cartell icon and the default sound. Android files it under a channel named "Miscellaneous". |
  | Open on screen | The app draws it itself as a high-priority banner with sound, on a channel also named "Miscellaneous". Each new one **replaces** the previous one (Q21). iOS shows only the app's copy, never a duplicate. |

- **Tapping a notification** just opens the app (normal start-up → Hubs list). There is no jump to
  the event.
- **Silent data messages** are never shown.
- **The server's test notification** reads "Test Notification" / "You can ignore this."
- **Permission prompt** (Android 13+ "Allow Cartell to send you notifications?", iOS
  alert/sound/badge) whenever permission is not yet granted, at:
  - login
  - automatic sign-in
  - **every time the Hubs list opens**

  The phone decides whether to show it again. The app never sends the user to Settings.
- **Android notification settings** show **two channels both named "Miscellaneous"** (Q22).

### Behind the scenes
- **Background handler**: only logs.
- **Foreground display**: a local notification on channel id `?` "Miscellaneous", max importance,
  default sound, small icon `@mipmap/ic_launcher`, **notification id always 0**.
- **Background/killed**: the OS shows it through the FCM fallback channel (the manifest names no
  default channel).
- **iOS**: `AppDelegate` sets the notification-centre delegate; foreground presentation is done by
  the app.
- **Push token lifecycle**:

  | When | What happens |
  |---|---|
  | Login | validate, then register |
  | Auto-login | get, store if changed, **always** register |
  | Every Hubs visit | register again (Q23) |
  | `onTokenRefresh` | store; register if signed in |
  | Log out | unregister + Firebase delete + delete stored |
  | Debug env switch | delete stored |

| Call | Sends | Gets back | Fail code |
|---|---|---|---|
| `POST /notifications/register_device/` | `token`, `device_name` (phone model), `platform` (`Android`/`iOS`) | anything | `938dc` |
| `POST /notifications/register_device/validate/` | `token` | `{"valid": bool}` | — |
| `DELETE /notifications/register_device/` | `token` | ignored | — |

### Flutter source
- `utilities/notifications.dart`: Firebase init, background handler, `onMessage`, `onTokenRefresh`
- `services/notifications.dart`: permission request, local notification display
- `services/auth_manager/check_creds.dart`: `sendFCMToken`, `validateFCMToken`, `getFCMToken`,
  `fullLogin`
- `services/requests/user_requests.dart`: `postMessagingData`, `validateMessagingData`,
  `deleteMessagingData`
- `utilities/device_info.dart`: device name and platform strings
- `frontend/ios/Runner/AppDelegate.swift`,
  `frontend/android/app/src/main/AndroidManifest.xml`

---

# C. Hubs

## 15. Hubs list (home)

Feature page: [09](docs/features/09-hubs-list.md) · Spec: 10 §2

### User experience
- **Top bar**: ☰, logo, ⋮ with one item "Add Hub".
- **Heading**: "Hubs" (large, bold, letter-spaced, Source Sans Pro) and "View existing HUBs or add a
  HUB".
- **No hubs**: a dark card with "No Hubs have been added.", a big satellite dish, and "Press the plus
  button below to get started." The card loses its width limit at about 1.25× text.
- **Hubs**: one column of square cards, at most 300 px wide (no limit at about 1.5× text), in
  server order. Each card has:
  1. hub name (scrolls sideways if long)
  2. `HUB.png`, or a large orange warning triangle if the hub is blacklisted
  3. a broadcast-tower icon (amber if connected, dark grey if not) + "Status: Connected" /
     "Status: Disconnected" / "Status: Blacklisted"
  4. a red circle badge (about 40 px) on the top-right corner if any sensor on the hub is flagged
- Round amber **+** bottom-right.

**Taps**

| The user… | What happens |
|---|---|
| taps a card | Hub details (Part 16) |
| taps **+** or ⋮ → Add Hub | Add a hub (Part 19) |
| pulls down | after 2 s, the list reloads in place (no loading screen) |
| presses Android Back | "Leave App" popup (Part 6) |

**Every visit**:
- Cached hubs show immediately; the Loading screen appears only on the very first visit.
- The list is refreshed in the background.
- The notification permission is requested again.
- If the user has already tapped into a hub, the refresh doesn't pull them back.
- Cards update by themselves when any other screen downloads newer hub data.

**Load failure**: no message. Session dead → Welcome. Otherwise retry after 1, 2, 3 s, then leave
the screen as it is.

**Odd but true**:
- "HUBs" and "Hubs" both appear.
- "Blacklisted" here vs "flagged" on other screens.
- The hub picture is a 4.2 MB image.

### Behind the scenes

| When | Call | Gets back | Fail code |
|---|---|---|---|
| open, pull-to-refresh | `GET /devices/` | list of hubs (Part 3) | `befba` |
| open | `POST /notifications/register_device/` (`token`, `device_name`, `platform`) | anything | `938dc` |

### Flutter source
- `screens/devices/devices_screen.dart`
- `components/ellipsis.dart`: ⋮ "Add Hub"
- `components/reusable_card.dart`
- `bloc/devices/events/go_to_devices_home_screen.dart`
- `bloc/devices/events/refresh_devices_event.dart`
- `bloc/main_app/events/go_to_hubs_screen_event.dart`
- `services/auth_manager/check_creds.dart`: `fullLogin` on mount
- `screens/bloc_widgets/devices_bloc_widget.dart`: recovery backoff

---

## 16. Hub details

Feature page: [12](docs/features/12-hub-details.md) · Spec: 10 §3

### User experience
- **Top bar**: ☰, logo, ⋮ menu:

  | Item | Opens |
  |---|---|
  | ✏ **Rename Hub** | Part 18 |
  | ⓘ **About** | Part 18 |
  | ☁ **Check for updates** | Part 21 |
  | ⊗ **Delete Hub** (red) | Part 18 |

- **←** (to the Hubs list), then the **hub name** (large).
- **Flagged warning**, only if the hub is blacklisted: a pink box with a red border, "This hub has
  been flagged for suspicious activity. Please contact support to re-activate this hub". No button.
- **Status glyph**: a large tower icon with a small badge, and a status line:

  | Situation | Icon | Badge | Text |
  |---|---|---|---|
  | Still checking | light grey | none | "Status: Checking..." (grey) |
  | Connected | amber | ✓ | "Status: Connected" |
  | Disconnected | dark grey | ✗ | "Status: Disconnected" |
  | Check failed, last known connected | amber | ✓ | "Status: Last known connected" |
  | Check failed, last known disconnected | dark grey | ✗ | "Status: Last known disconnected" |

- **Six buttons** in two columns (blue icon, white label; dark grey when disabled; wider side
  margins on wide screens):

  | Button | Enabled when | Does |
  |---|---|---|
  | **History** | always | this hub's event history (Part 26) |
  | **Open Gate** | "Integrator support" on **and** hub connected | toast "Sent message to open gate" **at once** |
  | **Sensors** | always; a red dot if any sensor is flagged | Sensors list (Part 22) |
  | **Firmware Updates** | always | Part 21 |
  | **Connect HUB** | hub **disconnected** | Wi-Fi pairing (Part 20) |
  | **Hub Settings** | always | Part 17 |

- A thin divider and "Last Updated: 10-06-2026 03:07 PM" (when the screen last refreshed).
- The screen appears instantly with "Status: Checking...", then updates.
- Pull down → after 2 s the hub reloads and "Last Updated" changes. Errors are ignored.
- Tapping a disabled button does nothing.
- ← / Back → Hubs list.

**Odd but true**:
- Open Gate never shows a failure (Q39).
- The integrator flag that enables Open Gate is not refreshed during a session (Q19).
- "Connect HUB" cannot start pairing for a hub the server shows online.

### Behind the scenes

| When | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| open, pull-to-refresh | `POST /devices/{id}/message/get_health/`, then `GET /devices/{id}/` | empty | hub | `70a42`; `a54db` / `e412a` |
| Open Gate | `POST /devices/{id}/message/trigger_integrator/` | empty | < 300 | `7466e` |

Hub screens use `emitThenRefresh` (Part 6): cached data first, then revalidate. On an ordinary
failure they stay put with "Last known…"; only a dead session moves the user.

### Flutter source
- `screens/devices/device_view.dart`: screen, ⋮ menu, delete flow (Part 18)
- `components/hub_status_glyph.dart`
- `components/three_button_rows/icon_button_row_entry.dart`
- `components/timed_pull_to_refresh.dart`
- `utilities/text_formatters.dart`: `formatDateAndTime`
- `bloc/devices/events/go_to_specific_device_event.dart`
- `services/requests/device_requests.dart`: `setDevice`, `queryHubHealth`, `triggerIntegrator`

---

## 17. Hub settings

Feature page: [13](docs/features/13-hub-settings.md) · Spec: 10 §4

### User experience
- **Top bar**: ☰, logo, **X**. Then ←, the hub name, and the status glyph (refreshed on open).
- A scrollbar that is always visible.
- **Five rows**: label left, amber switch right, thin lines between. Each switch moves **at once**,
  saves, then shows a grey toast (✓ on success, "!" on failure). On failure it **flips back**.

  | Row | Saved toast | Failure toast |
  |---|---|---|
  | "Enable Onboard Sensor:" | "Onboard sensor turned on." / "Onboard sensor turned off." | Hub offline: nothing sent, "Hub is not connected. Please connect hub and try again." Otherwise "Error encountered of type: <error name>. Onboard sensor turned off/on. Please try again soon." (names the state it went back to) |
  | "Enable Integrator Support:" | "Integrator support turned on." / "…off." | "Email notifications failed to turn on." / "…off." (wrong words, Q7) |
  | "Receive Hub Notifications:" | "Notifications turned on." / "…off." | "Notifications failed to turn on." / "…off." |
  | "Receive Connection Notifications:" | "Notifications turned on." / "…off." | "Notifications failed to turn on." / "…off." |
  | "Receive Email Notifications:" | "Email notifications turned on." / "…off." | "Email notifications failed to turn on." / "…off." |

- **Pair Integrator**: shown under the integrator row only while it is on. A small button with amber
  text; toast "Sent pairing message successfully" at once. It never reports failure (Q39).
- Only the onboard-sensor switch checks whether the hub is online.
- X / ← / Back → Hub details.

### Behind the scenes
All switches send `PATCH /devices/{id}/` with one field, value `"true"`/`"false"`; success = 200.

| Control | Field / call | Note | Fail code |
|---|---|---|---|
| Onboard sensor | `should_use_onboard_sensor` | **no session check first** | `41ef1` |
| Integrator support | `should_use_emulated_sensor` | | `f7061` / `69f90` |
| Hub notifications | `should_send_notification` | | `f7061` / `69f90` |
| Connection notifications | `should_send_connection_notification` | | `f7061` / `69f90` |
| Email notifications | `should_send_email` | | `f7061` / `69f90` |
| Pair Integrator | `POST /devices/{id}/message/pair_to_integrator/` (empty, < 300) | | `7466e` |
| open | `get_health` + `GET /devices/{id}/` | | |

### Flutter source
- `screens/devices/device_settings_screen.dart`
- `components/forms/auto_switch.dart`
- `components/hub_status_glyph.dart`
- `bloc/devices/events/go_to_device_settings.dart`
- `services/requests/device_requests.dart`: `setOnboardSensor`, `setDeviceIntegratorSupport`,
  `setDeviceNotificationPolicy`, `setDeviceConnectionNotificationPolicy`,
  `setDeviceEmailNotificationPolicy`, `pairToIntegrator`

---

## 18. Rename, About and Delete hub

Feature page: [14](docs/features/14-rename-about-and-delete-a-hub.md) · Spec: 10 §3, §5, §6

### User experience
**Rename hub**
- Layout: top bar with **X**; ←; a small satellite-dish icon with amber **"Hub Settings"** (yes, on
  the rename screen); "Enter Your Hub Name."; **Hub Name** field filled with the current name;
  **Submit** (blue, ✓ icon).
- Submit waits for the server, then goes to Hub details showing the new name.
- If saving fails, nothing visible happens (Q27).
- Empty names are not checked.
- X / ← / Back → Hub details without saving.

**About hub**
- Layout: top bar with **X**; ←; hub name; status glyph (refreshed on open).
- Rows (label left, value right; stacked at about 1.5× text):
  - "Mac Address", e.g. `48:27:e2:b1:94:44`, as the server stores it
  - "Controller Firmware Version" (the ESP32 chip), e.g. `1025`
  - "Transmitter Firmware Version" (the RFM6601 radio chip)
- A missing version shows the word **"null"** (Q18).
- "Last Updated: " + the **current** date and time, recomputed on every redraw (Q18).
- X / ← / Back → Hub details.

**Delete hub**
1. ⋮ → **Delete Hub** (red). The popup opens **on top of the still-open menu**: "Delete Hub?" /
   "Are you sure you want to delete this Hub? Note: Any sensors paired to this hub will remain
   paired until manually deleted." with **Cancel** / **Delete**.
2. **Delete** succeeds → the popup and menu close and the Hubs list reloads without the hub.
3. Fails → the popup stays open with no message (Q27).
4. **Cancel** → the ⋮ menu is still open underneath.
5. There is no undo.

### Behind the scenes

| Action | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| Rename | `PATCH /devices/{id}/` | `name` | 200 | `c43be` / `80ae9` |
| About (open) | `POST /devices/{id}/message/get_health/`, `GET /devices/{id}/` | | hub | |
| Delete | `DELETE /devices/{id}/` | | < 300 | `cda7f` (session) / `5486f` |

### Flutter source
- `screens/devices/edit_device.dart`: Rename
- `screens/devices/device_meta.dart`: About
- `screens/devices/device_view.dart`: ⋮ menu and Delete
- `components/key_value_pair_display.dart`, `components/hub_status_glyph.dart`
- `utilities/text_formatters.dart`
- `bloc/devices/events/go_to_edit_device_screen.dart`
- `bloc/devices/events/go_to_about_device_screen.dart`
- `services/requests/device_requests.dart`: `updateDeviceData`, `deleteDevice`

---

## 19. Add a hub

Feature page: [10](docs/features/10-add-a-hub.md) · Spec: 15, 17 §4

### User experience
**Add hub screen** (☰, logo):
1. **←**
2. **"Enter Hub Information"**
3. a big amber tile with a QR-scanner icon: "Tap To Scan QR Code"
4. **Hub Name** field
5. **Mac Address** field: appears once a MAC is involved; hex only, capitalised, colons added
   (`XX:XX:XX:XX:XX:XX`)
6. **Submit** (amber): grey and disabled until both fields have text; while sending it becomes an
   amber bar with a white spinner
7. a blue link "Tap to Add Mac Address Manually", until the MAC field shows

Field messages after leaving a field empty: "Device name cannot be empty." / "Mac address cannot be
empty."

**QR scanner** (a full-screen page that slides in):
- Top bar "Scan Hub QR Code" with a back arrow; camera on a black background; a dark band across
  the bottom quarter.
- **Searching**: amber spinner + "Please scan the QR code on the hub".
- **A code that isn't a MAC**: ✗ + "That does not seem to match a QR code on a hub" + **Clear scan**.
- **A valid code** (`AA:BB:CC:DD:EE:FF` or with dashes): the scanner closes **immediately**, and the
  MAC field fills in and **locks**.
- The camera permission is asked the first time.

**Other taps**

| The user… | What happens |
|---|---|
| taps the locked MAC field | "Change Mac Address" / "The Mac Address of your hub has already been scanned. Are you sure you'd like to change it?" → **Okay** unlocks it. There is no Cancel; only Android Back dismisses it (Q45). |
| taps "Tap to Add Mac Address Manually" | the MAC field appears, empty and editable (or locked if a scanned MAC exists) |
| taps ← / presses Back | Hubs list |

**Submit results**

| Result | What the user sees |
|---|---|
| Accepted (< 300) | **Hub Added** screen |
| Refused (300–499) | "Adding Hub Failed" with the server's reasons one per line, or "An Error occurred. Please try again." |
| Server error (500+) | "Adding Hub Failed" / "Failed to add hub. Please try again. If the problem persists, please contact support." |
| Network drop | the spinner keeps spinning |

**Hub Added screen** (no top bar, centred):
- "Hub Added to Account!", a large amber ✓
- "Your hub is now added to your account."
- "Next, we will pair the hub to your Wi-Fi. Are you ready to proceed?"
- **Proceed and Pair To Wi-Fi** (amber) → Part 20
- **Pair to Wi-Fi Later** (blue) → Hub details

Android Back → Hub details.

**Odd but true**:
- Q12: an internal empty-field guard shows "Make sure you enter a Name and valid Mac Address before
  submitting" and leaves the spinner on (unreachable from the enabled button).
- Q13: after confirming Change Mac Address, Submit shows that popup again.
- Q14: if the profile can't load on open, the screen breaks; code `15b12a`, "An error occurred while
  adding a hub. If this continues to happen contact support."
- Q15: an older server message can reappear in a later failure.

### Behind the scenes
- **On open**: load the profile; the hub is added to the **first** location.
- **Submit**:
  1. lower-case the MAC
  2. HMAC-SHA256 with the build's `macAddressHashKey` (64 hex characters); the plain MAC never
     leaves the phone
  3. POST
  4. on success, `get_health` + load the new hub → Hub Added
- **QR scanner**: accepts any barcode format, uses the first barcode, suppresses duplicates, and
  masks the camera in Sentry.
- An add-hub bloc of its own with 8 events (init, show/hide MAC, start scanning, scanned MAC, warn
  about editing, submit, error) and 5 states. `validName` is never set (Q16).
- The "validate produced device" check is commented out.

| When | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| open | `GET /profiles/me` (no slash) | | `locations[0].id` | `b323c` / `9eae2` |
| Submit | `POST /locations/{locationId}/devices/` | `name`, `mac_address` (HMAC hex) | < 300 with `id`; 4xx optional `non_field_errors` | `791fa` |
| after success | `POST /devices/{id}/message/get_health/`, `GET /devices/{id}/` | | new hub | |

### Flutter source
- `screens/devices/add_device/add_device.dart` (library) with its parts:
  - `screens/devices/add_device/add_device_screen.dart`
  - `screens/devices/add_device/successfully_added_device_screen.dart`
  - `screens/devices/add_device/bloc/add_device_bloc.dart`
  - events: `screens/devices/add_device/bloc/events/base_add_device_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_init_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_show_mac_address_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_hide_mac_address_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_start_scanning_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_scanned_mac_address_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_warn_about_editing_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_submit_event.dart`,
    `screens/devices/add_device/bloc/events/add_device_error_event.dart`
  - states: `screens/devices/add_device/bloc/states/base_add_device_state.dart`,
    `screens/devices/add_device/bloc/states/add_device_state.dart`,
    `screens/devices/add_device/bloc/states/add_device_initial_state.dart`,
    `screens/devices/add_device/bloc/states/add_device_loading_state.dart`,
    `screens/devices/add_device/bloc/states/add_device_showing_mac_address_field_state.dart`,
    `screens/devices/add_device/bloc/states/add_device_warn_about_editing_state.dart`
- `components/forms/qr_scanner.dart`: `MobileScannerSimple`
- `components/forms/text_field_with_post_change_validators.dart`
- `components/rounded_loader.dart`
- `services/hash_mac_address.dart`
- `services/text_formatters.dart`: MAC formatting
- `bloc/devices/events/go_to_add_a_hub_screen.dart`
- `bloc/devices/events/go_to_add_hub_success_screen.dart`
- `services/requests/device_requests.dart`: `addDevice`
- `services/requests/user_requests.dart`: `setProfile`

---

## 20. Connect hub to Wi-Fi (pairing)

Feature page: [11](docs/features/11-connect-hub-to-wifi.md) · Spec: 16, 17 · Hardware notes: root
`CLAUDE.md` "Measured hub behaviour", `frontend/docs/superpowers/DEVICE-VERIFICATION-427.md`

### User experience
**Ways in**: "Hub Added" → **Proceed and Pair To Wi-Fi**, or Hub details → **Connect HUB** (only
while the hub is disconnected).

**Common layout** for every pairing screen:
- the logo bar with **no menu**
- a grey "Step N of 6" on numbered steps
- a picture or animation, a bold title, an optional subtitle, then buttons
- some steps have an amber round **?** button bottom-right ("Help with this step") that opens an
  explanation popup with **Got it**
- the exit button is **Cancel** on most steps, **Return to Devices** on step 1 and on the end screens
- steps change **instantly**

**Screens in order**

| Screen | What the user sees | Buttons |
|---|---|---|
| **Step 1 of 6 — "Getting Your Hub Ready"** | "Your hub needs a moment to switch into pairing mode. Start Pairing turns on when it is ready." A blue ring counts down **15 s** with the number inside; at 0 it becomes an amber ✓. | **Start Pairing** (disabled until 0) → step 2; **Return to Devices** → Hubs |
| **Step 2 of 6 — "Plug in Hub"** | "Is your hub plugged in?" Power-plug icon in a ring. **?** → "Plugging In Your Hub" / "Connect the power adapter to your hub and plug it into a wall outlet. Your hub needs to stay plugged in from now on. It is what keeps your sensors talking to Cartell. Once it has power, a light next to the antenna will start to blink. Contact support if no light comes on at all." | **Yes** → step 3; **Cancel** → Hubs |
| **Step 3 of 6 — "Check the Light on Your Hub"** | "Does your Hub's light blink like this?" An animated light shows a short green flash every 3 s. "(The light should be located next to the antenna)". **?** → the "Finding the Light" text. | **Yes** → step 4. **It blinks differently** → "Reset Your Hub?" / "Resetting erases the Wi-Fi settings stored on your hub so it can start pairing again. Your account and your sensors are not affected. If your hub is already working on another network, resetting it will disconnect it." (**Keep trying** / **Reset the hub** → Reset). **I can't find the light** → "Finding the Light on Your Hub" / "The light sits next to the antenna. It is small, and in daylight you may need to shade it with your hand. Make sure the hub is plugged in and has had a few seconds to start up. If you still cannot see any light at all, contact support." (**Look again** / **Contact support**, which only closes the popup, Q1) |
| **Reset — "Hold the Reset Button In"** (not numbered) | A fast red flicker light. "Find the reset button on your hub and hold it in until the light blinks like above. Then release the button. Your hub's Wi-Fi settings are now reset." 'Once your hub has reset, press "The Hub Reset" below.' A progress bar for the first **3 s**. | **The Hub Reset** (appears after 3 s) → step 3 |
| **Step 4 of 6 — "Connect to Your Hub"** | "Connect to the WiFi signal of the HUB." Wi-Fi icon. "Before you press the button, have your Wi-Fi password ready. Please ensure your network is 2.4GHz before proceeding." **Android only**: if the phone's Wi-Fi is off (checked on open and on return to the app), an amber box "Your WiFi is turned off. Please enable WiFi to connect to your Hub." and the button is disabled. **?** → "Connecting to Your Hub": the phone will ask to join "Cartell Hub" + MAC, leaves the home Wi-Fi meanwhile and rejoins afterwards, and what to check if no prompt appears. | **Connect to Hub**; **Cancel** → Hubs |
| **Step 4 — "Connecting to HUB"** | "Your phone has to join the HUB's own network for this step." Spinner. 'Tap "Join" if your phone asks for permission.' (iOS) or 'Tap "Connect" …' (Android), and "Your phone may ask each time it joins a HUB. Pairing cannot continue until you answer." The **phone's own prompt** appears here (iOS "Join", Android "Connect"), only on a phone that hasn't approved this hub before. **?** → "Joining the HUB's Network": an unanswered prompt makes this step time out; if Cancel was tapped on the prompt, cancel and begin again. | **Cancel** (asks "Stop Pairing?") |
| **Step 4 — "Checking Connection to HUB"** | Spinner while the app talks to the hub directly. | **Cancel** |
| **Step 5 of 6 — "Select WiFi Network"** | "Choose the Wi-Fi network you want your hub to use. It must be a 2.4GHz network." The list fills as the hub reports networks: name + signal icon (full / two bars / one bar). For the first **8 s** while empty: spinner + "Looking for networks...". Still empty after that: "No networks found" / "Your hub can only see 2.4GHz networks. Check your router settings, then scan again." Footer: "If your network does not appear in the list, it may not be a 2.4GHz network. Please check your router settings and ensure your network is set to 2.4GHz." Rows are at least 48 px tall. | Tap a network → step 6; **Refresh Wifi Networks** clears the list and rescans; **Cancel** |
| **Step 6 of 6 — "Login To WiFi Network"** | A large Wi-Fi icon showing the network's signal; "Name: <network>". Password field "Enter network password": hidden, eye button, **no** autofill or autocorrect, and a plain **underline** instead of the amber outline (Q37). Over **64 bytes** → "This password is too long for the hub, which stores 64 characters. Accented and emoji characters use more than one each." and Connect is disabled. Developer builds also show the signal in dB and **Scan QR Code Password - Debug Only**. | **Connect**: with a password → send; empty → "Connect without a password?" / "<network> will be joined as an open network, so anyone nearby can see the traffic between your hub and your router." (**Go back** / **Connect anyway**). **Back to networks** → step 5 with a fresh scan. No Cancel button (Back still asks "Stop Pairing?"). |
| **Step 6 — "Sending data to Hub"** | Spinner. | **Cancel** |
| **Step 6 — "Checking Hub's connection..."** | Spinner and one status line with an icon: "Reconnecting your phone to your wifi network." / "Waiting for your hub to reach our servers." / "Having trouble reaching Cartell. Still trying." / "Checking on your hub." / "Still waiting for your hub." Then "m:ss elapsed" ticking every second, and "This can take a few minutes." from 1 minute. After the hub check (below) finds the hub silent, a **light guide**: "Your hub has not reached us yet. The light on it says what is happening." with four rows: no light ("No power. Check that it is plugged in."), solid green ("Already set up. Check your Devices list."), solid blue ("On your Wi-Fi, but that network has no internet."), slow green flash ("Still waiting for setup. Try pairing again."). There is **no time limit**. | **Cancel** → "Stop Pairing?" → Pairing stopped |
| **Success** | ✓ "Hub has successfully connected to the network." | **Continue** → feedback prompt (Part 31) → Hubs |
| **Hub reverted** | "Your hub could not join that network" / "It went back to waiting for setup, so the details it was given did not work." Check-list: "The Wi-Fi password, which is the usual cause.", "That the hub is close enough to your router.", "That your router is powered on and its network is up." The Wi-Fi Pairing light. | **Try Again** → step 1; **Return to Devices** |
| **Pairing stopped** | "Pairing stopped" / "Your hub may already be connected. Check your Devices list before pairing again." "Code: e5b1907d-C". No amber. | **Return to Devices** (first); **Begin Pairing Again** → step 1 |
| **"Reconnecting to the server"** | "Please wait" + spinner while the phone returns to its own Wi-Fi (up to 90 s). | **Cancel** (stops the wait early) |
| **Failure** | Large Wi-Fi-off icon, the error message as the title, an optional explanation, and "Error: <code>" in small grey text. | **Begin Pairing Again** → step 1; **Return to Devices** |
| **Reconnect failed** | "Please verify your network connection and try again" | **Try Reconnecting Again** → another 90 s → ✓ "Successfully reconnected to the server." → **Continue** → Hubs |

**Leaving part-way**
- Steps 1–4, before the phone joins the hub, and every end screen: Cancel, Return to Devices, ← and
  Back go straight to the Hubs list.
- From "Connecting to HUB" on: they first ask **"Stop Pairing?"** / "Your hub is part-way through
  setup. If you stop now it may not connect, and you will need to start again." (**Keep pairing** /
  **Stop pairing**). The answer is re-checked against the current state at tap time. Stopping
  cleans up, then shows the failure screen with an `e5b1907d-…` code, or "Pairing stopped" if it was
  waiting for the server.

**Error codes on screen**

| Code | Message | When |
|---|---|---|
| `762c844a-0` | "Your phone never reached the HUB." + 'If your phone asked for permission to join a network, that prompt may still be waiting, or it may have been dismissed. Try again, and tap "Join/Connect" when you see it.' | 40 s of messages with no reply |
| `762c844a-1` (`-2`, `-3` in dev builds) | "The connection to your hub could not be verified. Please try again." | replies came, but verification didn't finish in 40 s |
| `762c844a-W` | same | unexpected message from the hub |
| `762c844a-S` | "Could not open a connection to your hub. Please try again." | the local network port couldn't open |
| `9d5a3474` | "We weren't able to connect to your hub. Please try again later." | every send failed |
| `8874c4b9` | "Connection is unreliable. Please try again." | more than 12 send failures |
| `dbd39a14-b708` | "We weren't able to connect to your hub. Please try again later." | no ack for the Wi-Fi details (about 20 s) |
| `3b3cd169-f023` | same | credential sending ran out |
| `e5b1907d-J` / `-V` / `-N` / `-K` / `-S` / `-R` | "Pairing was cancelled. Please try again later." | stopped while joining / verifying / choosing a network / entering the password / sending / reconnecting |
| `d63f9b07` | same | **Cancel** on "Reconnecting" with no clean-up running |
| `e5b1907d-A` | "Your session has expired. Please sign in again to finish setting up your hub." | 3 session failures in a row while waiting |

**Odd but true**:
- The hub's "got it" means nothing about the password. A wrong password is found only by the hub
  check about a minute later.
- The phone's join prompt appears only the first time per hub.
- A "Your Hub is added to your account. To connect, tap Return…" line exists but is never shown
  (Q38).

### Behind the scenes
1. **Entering**: `get_health` + `GET /devices/{id}/` (for the MAC). A new pairing state machine is
   created (21 events, 24 states).
2. **Join** "Cartell Hub <MAC>":
   - WPA password `family12`, join-once, no internet.
   - Android uses `WifiNetworkSpecifier`; iOS uses `NEHotspotConfiguration`.
   - Then 500 ms → force traffic onto Wi-Fi → 500 ms → bind UDP `0.0.0.0:6452`.
   - Mark pairing in progress. This pauses the maintenance check and turns guard reports into
     breadcrumbs. The app is treated as "paused" for the mode watcher.
3. **Verify**: send "get firmware version" twice a second for up to 40 s (80 tries).
4. **Write the server address** `wss://<server>/hub/` three times (0, 120, 240 ms). Developer builds
   also read it back and compare it (two extra stages); release builds only write it.
5. **Scan**: ask for Wi-Fi networks every 10 s until results arrive.
6. **Send credentials**: SSID and password, each padded to 64 bytes and AES-128-CBC encrypted
   (fixed key and IV, no padding scheme), every **4 s** until the hub acks. Advance once on the
   first ack only.
7. **Teardown**: wait 2 s, then three 1 s steps: leave the hub network and return to the home Wi-Fi.
8. **Wait for the server**: `GET /devices/{id}/` until `device.is_connected` is true.
   - Every 2 s for checks 1–3, 5 s for 4–6, 15 s for 7–12, then 60 s.
   - In the background it idles, re-checking every 5 s whether the app is back.
   - 3 session failures → `e5b1907d-A`.
9. **Hub check (access-point probe)**: once, about **60 s** after the ack, only while on screen:
   re-join the hub network and send "get firmware version", waiting up to 8 s.
   - The hub answers → it went back to setup mode → **Hub reverted**.
   - Silence → keep waiting and show the light guide.

   The next poll is clamped to the probe's due time.
10. **Error path**: clean up, then poll `GET /test/` for up to 90 s (1 s, then 2 s, then 5 s
    apart). **Any** answer counts as reachable. Then the failure screen.
11. **Sentry**:
    - breadcrumbs per stage
    - `GenericPairToWifiException` captures with each code
    - one summary per waiting phase: `hub pairing registration poll ended: <outcome>`, with check
      count, whether the server was ever reached, elapsed time and failure reasons

**Hub messages (UDP)** to `192.168.4.1:5002`, replies on `6452`. Each packet is header `DE AD BE
EF`, type, length, payload and checksum (byte layout in spec 17).

| Message | When | Hub replies |
|---|---|---|
| Get firmware version | twice a second while verifying; the hub check | firmware version number |
| Set WebSocket URI | three times after verifying | — |
| Get WebSocket URI | dev builds only (verification stages 2–3) | the stored URI |
| Scan Wi-Fi | step 5, every 10 s until found | one reply per network: SSID (NUL-terminated), RSSI, channel |
| Check and save Wi-Fi, encrypted (`0x000A0123`) | every 4 s | ack, always "1", even for a wrong password |

**Server calls**

| When | Call | Gets back |
|---|---|---|
| entering pairing | `POST /devices/{id}/message/get_health/`, `GET /devices/{id}/` | hub |
| waiting for the hub | `GET /devices/{id}/` repeatedly (no explicit session check) | `device.is_connected` |
| reconnecting | `GET /test/` repeatedly, up to 90 s | any answer = reachable |

### Flutter source
- `screens/devices/connect_hub_to_wifi/connect_hub.dart` (library) with its parts:
  - `screens/devices/connect_hub_to_wifi/bloc.dart`: `HubConnectionBloc`
  - `screens/devices/connect_hub_to_wifi/states.dart`: the 24 states
  - `screens/devices/connect_hub_to_wifi/events/hub_event.dart`,
    `screens/devices/connect_hub_to_wifi/events/hub_setup_events.dart`,
    `screens/devices/connect_hub_to_wifi/events/hub_connection_events.dart`,
    `screens/devices/connect_hub_to_wifi/events/wifi_network_events.dart`,
    `screens/devices/connect_hub_to_wifi/events/wifi_connection_events.dart`,
    `screens/devices/connect_hub_to_wifi/events/error_events.dart`: the 21 events
  - `screens/devices/connect_hub_to_wifi/connection_constants.dart`: timings
  - `screens/devices/connect_hub_to_wifi/hub_wifi.dart`: join / force Wi-Fi / leave
  - `screens/devices/connect_hub_to_wifi/utilities.dart`: `GET /test/` reachability,
    ask-for-firmware-version helper
  - `screens/devices/connect_hub_to_wifi/pairing_step_index.dart`: "Step N of 6" numbering
  - `screens/devices/connect_hub_to_wifi/timer_manager.dart`
  - widgets, one per screen:
    - `screens/devices/connect_hub_to_wifi/widgets/hub_connect_widget.dart`: host, state → screen,
      "Stop Pairing?"
    - `screens/devices/connect_hub_to_wifi/widgets/begin_pairing_hub_widget.dart`: step 1
    - `screens/devices/connect_hub_to_wifi/widgets/check_if_plugged_in_widget.dart`: step 2
    - `screens/devices/connect_hub_to_wifi/widgets/verifying_hub_state_widget.dart`: step 3 and
      its popups
    - `screens/devices/connect_hub_to_wifi/widgets/resetting_hub_widget.dart`: reset
    - `screens/devices/connect_hub_to_wifi/widgets/intitial_connection_widget.dart`: step 4
    - `screens/devices/connect_hub_to_wifi/widgets/connecting_to_hub_widget.dart`: Connecting to
      HUB
    - `screens/devices/connect_hub_to_wifi/widgets/validating_connection_widget.dart`: Checking
      Connection to HUB
    - `screens/devices/connect_hub_to_wifi/widgets/list_wifi_networks_widget.dart`: step 5
    - `screens/devices/connect_hub_to_wifi/widgets/view_wifi_network_widget.dart`: step 6
    - `screens/devices/connect_hub_to_wifi/widgets/start_hub_connecting_to_wifi_widget.dart`:
      Sending data
    - `screens/devices/connect_hub_to_wifi/widgets/checking_if_hub_connected_to_server_widget.dart`:
      waiting
    - `screens/devices/connect_hub_to_wifi/widgets/hub_light_readings.dart`: the waiting-screen
      light guide
    - `screens/devices/connect_hub_to_wifi/widgets/success_widget.dart`
    - `screens/devices/connect_hub_to_wifi/widgets/hub_reverted_widget.dart`
    - `screens/devices/connect_hub_to_wifi/widgets/pairing_stopped_widget.dart`
    - `screens/devices/connect_hub_to_wifi/widgets/reestablish_connection_to_server_widget.dart`
    - `screens/devices/connect_hub_to_wifi/widgets/failure_widget.dart`
    - `screens/devices/connect_hub_to_wifi/widgets/wifi_reconnect_failed_widget.dart`
- Separate files in the same folder:
  - `screens/devices/connect_hub_to_wifi/hub_registration_poller.dart`: the waiting loop
  - `screens/devices/connect_hub_to_wifi/hub_registration_check.dart`: one server check, backoff
    decisions
  - `screens/devices/connect_hub_to_wifi/hub_access_point_probe.dart`: the 60 s hub check
  - `screens/devices/connect_hub_to_wifi/server_reachability.dart`: the 90 s reconnect
  - `screens/devices/connect_hub_to_wifi/reply_guard.dart`: advance only on the first valid ack
  - `screens/devices/connect_hub_to_wifi/pairing_error_codes.dart`: codes and messages
- `components/pairing/pairing_step_scaffold.dart`: the shared step layout
- `components/hub_light_widget.dart`, `components/key_value_pair_display.dart`,
  `components/forms/qr_scanner.dart` (debug password scan), `components/user_feedback.dart` (after
  success)
- `udp_commands/commands.dart` (library) with its parts:
  - `udp_commands/commands/abstract_udp_command.dart`: packet layout and checksum
  - `udp_commands/upd_command_routing.dart`: reply routing
  - `udp_commands/commands/firmware_version_commands.dart`
  - `udp_commands/commands/set_websocket_uri_commands.dart`
  - `udp_commands/commands/scan_wifi_commands.dart`
  - `udp_commands/commands/network_password_check_and_save_encrypted.dart`: the one used
  - unused in the shipping flow: `udp_commands/commands/set_wifi_ssid_and_password_commands.dart`,
    `udp_commands/commands/wifi_test_commands.dart`,
    `udp_commands/commands/network_password_check_and_save.dart`
- `udp_commands/udp_connection.dart`: socket singleton, bind, send destination check, listeners
- `services/encryption.dart`: AES-128-CBC, 64-byte fields
- `services/immediate_timer.dart`
- `bloc/devices/events/go_to_connect_hub_bloc.dart`
- `services/requests/device_requests.dart`: `probeHubRegistration`, `setDevice`, `queryHubHealth`
- `utilities/AppWatchers/mode_watcher.dart`: pairing flag

---

## 21. Firmware updates

Feature page: [15](docs/features/15-firmware-updates.md) · Spec: 14

### User experience
**Ways in**: Hub details → **Firmware Updates**, or ⋮ → **Check for updates**.

**Firmware screen**: the Loading screen shows while four things load at once. Then (☰, logo):
- ← ("Back to hub") and the **hub name** (large).
- **"Current firmware"** card:
  - **Controller** (blue chip icon) and **Transmitter** (amber tower icon), each "v" + version (e.g.
    "v1025") or "Not reported". Side by side, stacked at about 1.4× text.
  - Connection line: amber "HUB connected", or red "HUB offline — versions shown are the last we
    heard".
- Then **one** of:
  - **Update running**: "Update in progress" / "Controller firmware is updating to v1030. Keep the
    hub powered on." (or "Transmitter") + **View progress** (amber) → progress screen, watching that
    update.
  - **Updates available**: "1 update available" / "2 updates available", then one card per
    out-of-date component (controller first):
    - "Controller firmware" / "Transmitter firmware"
    - "v1025 → v1030" ("?" if unknown)
    - **Update now** (blue for controller, amber for transmitter)

    While the hub is offline, Update now is grey and disabled, with "Reconnect the hub before
    updating." underneath.

    Tapping Update now → "Update this hub?" / "This takes a few minutes. Keep the hub powered on and
    on WiFi. You can leave this screen while it runs, and the hub keeps its current firmware if the
    update fails." (**Not now** / **Update**).
  - **Up to date**: green ✓, "Firmware is up to date", and "Both components are running the latest
    versions." (online) or "Both components were on the latest versions when the hub last checked
    in." (offline).
- ← / Back → Hub details.
- If the screen can't load → Hubs list.
- If the hub has never reported a version, the screen fails before showing and the user lands on
  the Hubs list (Q31).

**Progress screen** (no menu):
1. ← ("Back to firmware").
2. **Progress ring** (amber on dark grey, 200–300 px) with the percentage in the middle. It animates
   to each new value over 0.8 s, or jumps with "reduce motion". It becomes a large green ✓ on
   success, a red ✗ on failure.
3. Headline and explanation:

   | Stage | Headline | Explanation |
   |---|---|---|
   | Starting | "Starting update" | "Keep the hub powered on." |
   | Running | "Updating firmware" | "Keep the hub powered on. You can leave this screen — the update keeps running." |
   | Done | "Update complete" | "Your hub is now running v1030 and is back to watching for vehicles." |
   | Failed | "Update did not finish" | "Your hub kept its previous firmware and is still working. Check that it is powered on and connected, then try again." |

4. While running: **Elapsed** (mm:ss or hh:mm:ss) and **Remaining** (estimated), each
   "Calculating..." until there is enough data.
5. **Version** "v1030".
6. On failure: **Try again** (amber) and "Reference: <number>" in grey.

The screen reader announces "Firmware update 40 percent complete" at each 10% step, and the headline
when it ends.

**Error dialogs** (Material alert, amber **OK** → back to Firmware; tapping outside closes):

| Title | Message |
|---|---|
| "Cannot start update" | the server's explanation, word for word |
| "Sign in again" | "Your session expired before the update could start. Your hub is untouched. Sign in again and retry." |
| "Lost contact" | "We lost contact with the hub while watching the update. The update may still be running. Check that the hub is powered on and connected, then open Firmware again to see where it got to." |

**Leaving**:
- Leaving stops the watching, **not** the update. **View progress** picks it up again.
- After a success, ← / Back first runs the "Give Feedback" prompt (Part 31), then returns to
  Firmware.

### Behind the scenes
- **Open**: four fetches run concurrently (below). "Out of date" = the hub's version number is
  **lower** than the newest.
- **Update listener**:
  1. **Update now** starts the update and gets an update id; **View progress** uses the running
     update's id instead (no second start).
  2. Poll every **1 s**, never overlapping:
     - PENDING → "Starting"
     - RUNNING → percent = `file_cursor / file_size`, never going backwards
     - SUCCEEDED → 100%, and the hub's version is updated locally
     - FAILED → failed
     - anything else → failed + Sentry
  3. One failed poll is tolerated; **5 in a row** → "Lost contact".
  4. Time remaining is estimated from progress so far.

| When | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| open | `POST /devices/{id}/message/get_health/`, `GET /devices/{id}/` | | `esp32_app_version`, `rfm6601_app_version`, `is_connected` | |
| open | `GET /latest-esp32-app/` | | list; `[0]` = newest controller firmware | `2a380` / `d7562` |
| open | `GET /latest-rfm6601-app/` | | same, for the transmitter | `2a380` / `d7562` |
| open | `GET /devices/{id}/check_existing_firmware_update/` | | 200/202, list of running updates (first used) | `2a380` / `d7562` |
| Update | `POST /devices/{id}/message/update_firmware/` | `firmware` = firmware id | < 300 `{fw_update_id}`; else `non_field_errors` (joined by spaces) → "Cannot start update" | `03337` |
| every 1 s | `GET /firmware_update/{updateId}` (no trailing slash) | | `status`, `file_size`, `file_cursor`, `date_started`, `firmware` | Sentry + rethrow |

### Flutter source
- `screens/devices/firmware_update/available_firmware_updates_screen.dart`: Firmware screen
- `screens/devices/firmware_update/update_device_screen.dart`: progress screen, dialogs, feedback on
  leave
- `screens/devices/firmware_update/firmware_update_listener.dart`: polling
- `screens/devices/firmware_update/update_progress_snapshot.dart`
- `screens/devices/firmware_update/firmware_update_status_code.dart`,
  `screens/devices/firmware_update/firmware_update_status_type.dart`
- `components/key_value_pair_display.dart`, `components/user_feedback.dart`
- `utilities/scaling.dart`
- `bloc/devices/events/go_to_device_firmware_updates_event.dart`
- `bloc/devices/events/go_to_update_device_firmware_screen.dart`
- `services/requests/firmware_requests.dart`: `getLatestESP32APPFirmware`,
  `getLatestRFM6601APPFirmware`, `checkForRunningFirmwareUpdate`
- `services/requests/firmware_update_requests.dart`: `getDeviceUpdateStatus`
- `services/requests/device_requests.dart`: `startFwUpdateAndGetFileSize`

---

# D. Sensors

## 22. Sensors list

Feature page: [16](docs/features/16-sensors-list.md) · Spec: 13 §1–§2

### User experience
- **Top bar**: ☰, logo, ⋮ with one item "Pair Sensor".
- **←** (to Hub details), **"Sensors"** (bold, letter-spaced, Source Sans Pro), "View existing
  Sensors or add a Sensor".
- **No sensors**: a dark card "No Sensors have been added.", a sensor icon, "Press the plus button
  below to get started."
- **One sensor**: one centred square card, at most 300 px.
- **Two or more**: a two-column grid of square cards (extra side padding at 800 px+).
- Each card shows:
  - the sensor name
  - a picture: the black round sensor box (`Sensor.png`), or for the onboard sensor
    (`sensor_type "ON"`) the white probe on a coiled cable (`cartell_ct6.png`) + "Onboard Sensor"
  - a red badge on the corner if flagged

  Cards have no status text.
- Amber **+** bottom-right.

**Taps**

| The user… | What happens |
|---|---|
| taps a card | Sensor details (Part 23) |
| taps **+** or ⋮ → Pair Sensor | Add a sensor (Part 25) |
| pulls down | after 2 s the hub (and its sensors) reload; errors ignored |
| opens the screen | the list shows at once from the cached hub, then refreshes |
| ← / Back | Hub details |

**Odd but true**: the flagged badge doesn't change during a session (Q19).

### Behind the scenes
Sensors come from the hub record (`device.sensors`), in server order.

| When | Call | Gets back |
|---|---|---|
| open, pull-to-refresh | `POST /devices/{id}/message/get_health/`, then `GET /devices/{id}/` | hub with `device.sensors` |

### Flutter source
- `screens/sensors/sensors_screen.dart`
- `components/sensors/sensor_card.dart`, `components/sensor_ellipsis.dart`,
  `components/reusable_card.dart`
- `bloc/devices/events/go_to_sensors_screen_event.dart`

---

## 23. Sensor details

Feature page: [18](docs/features/18-sensor-details.md) · Spec: 13 §3

### User experience
- **Top bar**: ☰, logo, ⋮ with:
  - **Rename Sensor**
  - **Edit Coordinates**
  - **About**
  - **Delete Sensor** (red)

  (Part 24.)
- **←** (to the Sensors list).
- **Flagged warning** (only if blacklisted): a pink box with a red border, "This sensor has been
  flagged for suspicious activity. Please contact support to re-activate this sensor", and an amber
  **Contact Support** button → Help (Part 30).
- **Sensor name** (large), then the **picture** (round sensor, or the probe for the onboard sensor).
- **Battery** (not shown for the onboard sensor):
  - while re-reading: no icon, grey "Battery Status: Checking..."
  - low: red empty-battery icon, "Battery Status: Low"
  - fine: green full-battery icon, "Battery Status: Good"
- **Three buttons** in a row (stacked at about 1.5× text):

  | Button | Does |
  |---|---|
  | **Find Sensor** (has coordinates) | opens the phone's maps app at the sensor, labelled with its name: Google/default maps on Android, Apple Maps on iOS. Coordinates that aren't numbers → "An error occurred." / "Could not find location. Please make sure you have set a location for this sensor. If the problem persists, please contact support." |
  | **Set Location** (no coordinates) | Edit coordinates (Part 24) |
  | **View History** (router icon) | sensor history (Part 26) |
  | **About** | About sensor (Part 24) |

- Divider, then **"Receive Sensor Notifications:"** + switch:
  - success toast "Notifications turned on." / "…off."
  - on failure the switch flips back with "Notifications failed to turn on." / "…off."
- **Pair Sounder** (amber, onboard sensor only): a grey top banner with a ✓, "Sent pairing message
  successfully", for 4 s, blocking the screen. It shows before the server answers and never reports
  failure (Q39).
- "Last Updated: <date time>".
- Opens at once with battery "Checking...". Pull down → after 2 s re-read, and "Last Updated"
  changes.
- ← / Back → Sensors list.
- The flagged warning doesn't change during a session (Q19).

### Behind the scenes
- **Find Sensor** opens a link, not a server call: Android `geo:` with the coordinates and name; iOS
  `https://maps.apple.com/?ll=<lat>,<lng>&q=<name>`.
- **Contact Support** goes through the MainApp machine to Help.

| When | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| open, pull-to-refresh | `GET /sensors/{sensorId}/` | | sensor (Part 3) | `c3f22` / `40b27` |
| alert switch | `PATCH /sensors/{sensorId}/` | `should_send_notification` = `"true"`/`"false"` | 200 | `b323c` / `10a37` |
| Pair Sounder | `POST /devices/{hubId}/message/pair_to_sounder/` | empty | < 300 | `7466e` |

### Flutter source
- `screens/sensors/sensor_view.dart`: screen, ⋮ menu, delete (Part 24)
- `screens/sensors/sensor_flagged_banner.dart`
- `components/three_button_rows/three_button_row.dart`,
  `components/three_button_rows/icon_button_row_entry.dart`
- `components/teast_popups.dart`: the Pair Sounder banner
- `components/forms/auto_switch.dart`, `components/timed_pull_to_refresh.dart`
- `utilities/text_formatters.dart`
- `bloc/devices/events/go_to_specific_sensor_screen.dart`
- `services/requests/sensor_requests.dart`: `setSensor`, `setSensorNotificationPolicy`
- `services/requests/device_requests.dart`: `pairToSounder`

---

## 24. Sensor location, rename, about, delete

Feature page: [19](docs/features/19-sensor-location-rename-about-delete.md) · Spec: 13 §3–§6

### User experience
**Edit coordinates** (⋮ → Edit Coordinates, or **Set Location**)
- Layout: ☰, logo, spacer; ←; satellite icon + amber **"Sensor Coordinates"**; "Set Your Sensor
  Coordinates."; "Enter Coordinates in DMS format."; **Latitude** and **Longitude** fields (filled if
  set; normal keyboard); **Detect Location** (blue, map pin); **Submit** (amber).
- **Detect Location**: checks location services and permission (asks if needed), gets a
  high-accuracy position, and fills both fields at full precision. Failures, all titled **"Can't Get
  Location"**:

  | Case | Message |
  |---|---|
  | Location services off | "Location services are turned off on this device. Turn them on in Settings, or type the coordinates in by hand." |
  | Permission refused | "Cartell needs location access to place this sensor. Allow it when prompted, or type the coordinates in by hand." |
  | Permission refused forever | "Location access is turned off for Cartell. Turn it on in Settings > Cartell > Location, or type the coordinates in by hand." |
  | No fix | "Could not get a location fix. Move somewhere with a clearer view of the sky and try again, or type the coordinates in by hand." |

- **Submit**: both fields must be numbers, else "Coordinates Needed" / "Enter a latitude and
  longitude, or tap Detect Location to use where you are now." Each value is **cut** (not rounded)
  to 6 decimals, saved, then back to Sensor details. A failed save is silent (Q27).
- The text says "DMS format", but only decimals like `40.712776` are accepted.
- Location permission is asked **only here**.

**Rename sensor**
- Layout: ☰, logo, spacer; ←; satellite icon + amber **"Rename Sensor"**; "Enter Your Sensor
  Name."; **Sensor Name** filled with the current name; **Submit** (blue).
- Submit **waits** for the server, updates the name, then goes to Sensor details.
- A failed save is silent (Q27). Empty names are not checked.

**About sensor**
- Layout: top bar with **X**; ←; a large sensor picture, **always** the round sensor, even for the
  onboard probe (Q17); the sensor name (large); "Paired to Hub: <hub name>"; "Date Paired" with e.g.
  "10-06-2026 03:07 PM".
- The date is **not** converted to the phone's time zone (Q43).

**Delete sensor**
1. ⋮ → **Delete Sensor** (red). The menu closes, then "Delete Sensor?" / "Are you sure you want to
   delete this Sensor?" (**Cancel** / **Delete**).
2. Delete succeeds → the Sensors list.
3. Server refuses → the popup stays, no message (Q27).
4. The session check fails before sending → the app acts **as if it worked** (returns to the list,
   but nothing was deleted).

On each screen, ← / Back (and X on About) → Sensor details.

### Behind the scenes

| Action | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| Coordinates | `PATCH /sensors/{sensorId}/` | `latitude`, `longitude` as text (e.g. `40.712776`, `-74.005974`) | < 300 | `b323c` / `10a37` |
| Rename | `PATCH /sensors/{sensorId}/` | `name` | < 300 | `b323c` / `10a37` |
| About (open) | `POST /devices/{id}/message/get_health/`, `GET /devices/{id}/`, `GET /sensors/{sensorId}/` | | hub, sensor | |
| Delete | `DELETE /sensors/{sensorId}/` | | < 300 | `10a37`; session failure returns silently |

### Flutter source
- `screens/sensors/edit_coordinates.dart`: includes `formatCoordinate` and the geolocator flow
- `screens/sensors/edit_sensor.dart`
- `screens/sensors/sensor_meta.dart`: About
- `screens/sensors/sensor_view.dart`: ⋮ menu and Delete
- `components/key_value_pair_display.dart`
- `utilities/text_formatters.dart`
- `bloc/devices/events/go_to_edit_sensor_location_screen.dart`
- `bloc/devices/events/go_to_edit_sensor_screen.dart`
- `bloc/devices/events/go_to_specific_sensor_about_screen.dart`
- `services/requests/sensor_requests.dart`: `updateSensorData`, `deleteSensor`, `setSensor`

---

## 25. Add a sensor

Feature page: [17](docs/features/17-add-a-sensor.md) · Spec: 13 §7

### User experience
**Screen 1 — "Add a sensor"**
- Layout: ☰, logo; ←; "Add a sensor"; a large amber house-with-signal icon; a centred field "Name
  of sensor" (up to **32** characters, counter "0/32"); **Continue** (blue).
- **No check**: an empty name is allowed (Q10).
- ← / Back → Sensors list.

**Screen 2 — "Prepare to add"**
- Layout: top bar with **X**; ←; "Prepare to add"; a large amber magnifying glass; "Remove the top
  of the sensor's case. (blank line) Find the red button. (Don't press it yet.)"; **I see the red
  button!** (blue) → screen 3.
- X / ← / Back → Sensors list.

**Screen 3 — searching**
- **Searching**: "Press and release the red button for 1 second" (bold), a pulsing white circle,
  "Searching for sensor... 60" counting down, **Cancel**.
- **Found**: "The sensor has successfully connected to the Hub.", a green ✓, **Continue** → Sensors
  list.
- **Failed**: the reason, a red ✗, **Return** → Sensors list. Reasons:
  - "Hub is not connected. Reconnect it, wait 15 seconds, and then try again."
  - "The sensor was unable to connect to the Hub. Please try again. If the problem persists, please
    contact support."
- **Cancel** → stops, turns the hub's pairing mode off, → Sensors list.
- **Android Back** → Sensors list **without** turning pairing mode off (Q11).
- The hub's light shows "Sensor Pairing Mode" (slow blue flashes) while searching.
- The countdown usually runs longer than a minute, because each tick waits for network calls.

### Behind the scenes
1. **Screen 1 opens**: reload the hub in the background and note its **existing** sensors. If the
   user taps Continue too early, the note may be empty, so an old sensor looks "new" and gets
   renamed (Q10).
2. **Screen 3 starts**:
   1. Is the hub connected? If not → failure.
   2. Turn pairing mode **on**. This is not awaited, so a failure goes unnoticed and the search
      times out.
   3. Immediately and every **1 s**:
      1. session check (skip this tick on failure)
      2. hub still connected?
      3. count down; at 0 → failure
      4. fetch the hub's sensors. **More** than noted → the one not seen before is new → **Found**,
         then PATCH its name. A rename failure is silent.
   4. Whenever it ends → pairing mode **off**.
3. Sensors are compared by **count**, so a sensor deleted elsewhere meanwhile could confuse it.

| When | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| screen 1 | `POST /devices/{id}/message/get_health/`, `GET /devices/{id}/` | | existing `device.sensors` | |
| start + every 1 s | `GET /devices/{id}/` | | `device.is_connected` | `205f8` |
| start | `POST /devices/{id}/message/set_pairing_mode/` | `is_enabled` = `True` | status ≤ 450 accepted | Sentry + throw |
| every 1 s | `GET /devices/{id}/sensors` (no trailing slash) | | list of sensors | `11ebc` / `04c7b` |
| sensor found | `PATCH /sensors/{newId}/` | `name` | < 300 | `10a37` |
| end / Cancel | `POST /devices/{id}/message/set_pairing_mode/` | `is_enabled` = `False` | | |

### Flutter source
- `screens/sensors/add_sensor/00_enter_name_for_add_sensor.dart`
- `screens/sensors/add_sensor/01_remove_case_for_add_sensor.dart`
- `screens/sensors/add_sensor/02_sensor_connect_screen.dart`
- `services/immediate_timer.dart`
- `bloc/devices/events/go_to_add_sensor_start.dart`
- `bloc/devices/events/go_to_is_removing_case_for_add_sensor.dart`
- `bloc/devices/events/go_to_sensor_connect_screen.dart`
- `services/requests/device_requests.dart`: `setPairingModeRequest`, `isDeviceConnectedRequest`
- `services/requests/sensor_requests.dart`: `setSensors`, `updateSensorData`

---

# E. History, account and help

## 26. Event history

Feature page: [21](docs/features/21-event-history.md) · Spec: 12

### User experience
**Three versions sharing one list**

| Version | Opened from | Top bar right | Heading |
|---|---|---|---|
| All | menu → Event History | spacer | ← "All Event History" (bold) + white divider |
| One hub | Hub details → History | **X** | ← hub name (bold), "Hub's Event History", divider |
| One sensor | Sensor details → View History | **X** | ← sensor name (bold), "Sensor's Event History", divider |

**Event card**
- An amber icon on the left: a car (detection), a house with ✓ (connected), a house with ✗
  (disconnected).
- The sensor name, or the hub name if there is no sensor.
- The type in **red** for all three: "Motion Detected", "Connected", "Disconnected" (Q5).
- Date and time in the phone's time zone, e.g. "10-06-2026 3:07:45 PM". Hours 01–11 AM are
  zero-padded ("09:05:03 AM"), 1–11 PM are not ("1:05:03 PM"), and 00:xx and 12:xx show "12".
- A small grey line "Connected to <hub name>" if the event came from a sensor.
- At 1.75× text the icon moves above the text. Wider than 500 px, the cards centre.

**List behaviour**
- On open: heading at once, spinner in the list area.
- A blue spinner at the bottom while more pages exist. Scrolling to the very bottom loads the next
  page. If the first page doesn't fill the screen, no more pages ever load.
- No "no events" message. Cards can't be tapped. The screen rotates.

**Pull to refresh**

| Version | What happens |
|---|---|
| All | after 2 s the **whole screen** becomes a loading spinner, the list reloads from page 1, and the hubs list is also re-downloaded (Q24) |
| Hub | a spinner in the list area, then reload |
| Sensor | the list empties and refills, with no spinner |

**Failures**
- The first page can't load → leave the screen (Hubs list, or Welcome if the session is dead).
- Hub history, refresh or more fails → an orange triangle and the **raw error text**, e.g. "Instance
  of 'UnableToUpdateExceptions'" or "The request timed out. Check your internet connection and try
  again." (Q25).
- All and sensor history, refresh fails → the list is left empty.

**Leaving**: ← / Back go All → Hubs list, Hub → Hub details, Sensor → Sensor details. X does the same.

### Behind the scenes
- `event_type`: `AC` → "Motion Detected", `CO` → "Connected", `DC` → "Disconnected"; anything else
  (e.g. old `PS`) → "Motion Detected".
- **Next pages** follow the page's `next` URL, with its scheme forced to `https:` (or `http:` on a
  non-TLS dev server).

| Version | First page | Fail code |
|---|---|---|
| All | `GET /activations` (no trailing slash) | `4b6cf` / "Error Message 59538:" |
| Hub | `GET /devices/{id}/activations` (no trailing slash) | `24b87` / `50748` |
| Sensor | `GET /sensors/{id}/activations/` (trailing slash), plus `GET /sensors/{id}/` on open | `df3dc` / `0161e` |

Page shape: `{count, next, previous, results}` (Part 3). All-history refresh also calls
`GET /devices/`.

### Flutter source
- `screens/events/history.dart`: All history and the shared `HistoryCard`
- `screens/events/device_history.dart`: hub history
- `screens/events/sensor_history.dart`: sensor history
- `screens/events/phone_rotation_manager.dart`
- `components/timed_pull_to_refresh.dart`, `utilities/scaling.dart`
- `bloc/main_app/events/go_to_event_history_screen.dart`
- `bloc/devices/events/go_to_specific_device_history_event.dart`
- `bloc/devices/events/go_to_sensor_history_event.dart`
- `services/requests/event_requests.dart`: `setEventData`, `setDeviceEvents`, `setSensorEventData`
- `models/event.dart`

---

## 27. Account settings

Feature page: [22](docs/features/22-account-settings.md) · Spec: 11 §1–§2

### User experience
**While loading**: a skeleton appears at once: the "Account Settings" heading, four grey placeholder
rows, and a small blue spinner at the bottom.

**Loaded screen**
- **Top bar**: ☰, logo, ⋮ with **Delete Account** (person-with-✗ icon) → Part 29.
- A row with **←** on the left and, on the right, **"Connected Services: "** + an Amazon logo if this
  account has Alexa linked. The whole line shows **only** when the server's `alexa_enabled` setting
  is on.
- A large blue person-with-gear icon (tapping it does nothing) and **"Account Settings"** in amber.
- **Four rows** (blue icon, label, value), separated by amber lines; each stacks label over value at
  about 1.5× text:

  | Label | Value | Tap |
  |---|---|---|
  | **Name** | "First Last" | Edit name (Part 28) |
  | **Email** | the email | nothing (the email can't be changed in the app) |
  | **Password** | "Change" | Edit password (Part 28) |
  | **Phone** | "(555) 123-4567" for 10 digits; otherwise as stored; "Enter Phone Number" if empty | Edit phone (Part 28) |

- **Switch rows** (0 px side padding on iOS, 20 px on Android):

  | Row | Shown | Toasts |
  |---|---|---|
  | **"Unlock with Biometrics:"** | if the phone has biometrics enrolled, or it's on, or it couldn't be read | "Cartell will ask for your fingerprint or face when it opens." / "Biometric unlock turned off." / failure (flips back) "Could not save that setting. Please try again." |
  | **"Receive Notifications:"** | always | "Notifications turned on." / "…off." / failure (flips back) "Error encountered of type: <error name>. Notifications are still off/on. Please try again soon." |
  | **"Receive Email Notifications:"** | always | "Email notifications turned on." / "…off." / failure (flips back) "Error encountered of type: <error name>. Email notifications are still off/on. Please try again soon." |

  `<error name>` is the internal class name, e.g. `UnableToUpdateUserInformationException`.
- **Leaving**: ← / Back → Hubs list. If the user leaves while loading, nothing jumps back.
- **Load failure** → Hubs list (or Welcome if the session is dead). No message.

**Odd but true**:
- A user with **no phone value at all** (null, not empty) breaks the screen into a grey error area
  (Q30).
- A second Delete Account button exists at the bottom but is never shown.

### Behind the scenes
- User and profile load **at the same time**.
- The biometric switch is saved on the phone only.
- The Alexa setting is fetched **every time the screen redraws**, e.g. on every switch flip (Q34).

| When | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| open | `GET /auth/users/me/` | | user | `e6196` / `15955` |
| open | `GET /profiles/me` (no slash) | | profile (`should_send_notification`, `alexa_enabled`) | `b323c` / `9eae2` |
| open + every redraw | `GET /app/settings/?code=alexa_enabled` | | `{id, key, value}`, `value` read as true/false | `b323c` / `9eae2` |
| notifications switch | `PATCH /profiles/me/` (with slash) | `should_send_notification` = `"true"`/`"false"` | 200 | `8ba3d` / `aa1dc` |
| email switch | `PATCH /auth/users/me/` | `should_send_emails` = `"true"`/`"false"` | 200 | `5e49a` / `f5e37` |

### Flutter source
- `screens/account/account_settings.dart`: screen, ⋮ menu, Delete Account popups (Part 29)
- `screens/account/account_settings_skeleton.dart`
- `components/reusable_listing.dart`, `components/conditional_view_widget.dart`,
  `components/forms/auto_switch.dart`
- `utilities/text_formatters.dart`: `formatPhoneNumber`
- `services/biometric_service.dart`, `services/secure_storage.dart`
- `bloc/main_app/events/go_to_account_settings_screen.dart`
- `services/requests/user_requests.dart`: `setUser`, `setProfile`, `setProfileNotificationPolicy`,
  `setUserEmailNotificationPolicy`
- `services/requests/settings_requests.dart`: `getSetting`

---

## 28. Edit name, phone and password

Feature page: [23](docs/features/23-edit-name-phone-and-password.md) · Spec: 11 §3–§5

### User experience
All three have the top bar (☰, logo, **X**) and an **←**. X, ← and Back return to Account settings
**without saving**.

**Edit name**
- Layout: a round avatar picture; "Account Settings" in amber; "Enter Your Name."; **First Name**
  and **Last Name** filled with the current values; **Submit** (blue).
- **Submit** returns to Account settings **immediately**, without waiting for the server. Account
  settings may still show the old name, and a failed save is never shown (Q6).
- Empty names are not checked.

**Edit phone**
- On open, a spinner while the user is re-downloaded.
- Layout: avatar; "Account Settings"; "Enter Your Phone Number."; **Phone Number** filled with the
  current number (normal keyboard, not the phone keypad); **Submit**.
- If the download fails: an orange "!" and "Something went wrong. Please try again." (or "Your
  session has expired. Please sign in again."), with no buttons.
- **Submit** sends the number exactly as typed and returns **immediately** (Q6).

**Change password**
- Layout:
  1. ←, a small avatar and "Account Settings" (amber)
  2. **"Edit Your Password."**
  3. **Current Password** ("Enter your current password", eye button)
  4. **New Password** ("Enter your new password", eye button). As the user types, unmet rules are
     listed in **bright red**, one per line: "Password field cannot be empty", "Password must
     contain at least one uppercase letter", "Password must contain at least one number", "Password
     must contain at least one special character", "Password must be at least 8 characters long".
  5. **Confirm New Password** ("Re-enter your new password"): appears only when the new password
     passes every rule; cleared and hidden whenever it stops passing
  6. **Submit** (blue)
- New and Confirm differ → "Passwords Do Not Match" / "Please make sure your new password and
  confirmation match." Nothing is sent.
- Otherwise a dimmed overlay with a spinner; **Submit, X, ← and Back are all disabled** until the
  server answers.

  | Result | What the user sees |
  |---|---|
  | Accepted (< 300) | "Password Change Successful!" (no message) → **Okay** → Account settings. The user stays signed in. |
  | Refused (wrong current password, weak new one) or network error | "An error occurred." / "Please try again. Contact support if errors persist." The server's reason is never shown. |

- Changing one valid new password into a different valid one keeps the old Confirm text, so the user
  may get "Passwords Do Not Match" without seeing why (Q26).

### Behind the scenes
- Name and phone `PATCH` calls are **not awaited**.
- Edit phone fetches the user **twice** on open (once to show the form, once to fill the field).
- A successful password change also purges the legacy keys.

| Action | Call | Sends | Gets back | Fail code |
|---|---|---|---|---|
| Name (open) | none; uses the loaded user | | | `c5911` if filling the fields fails |
| Name (Submit) | `PATCH /auth/users/me/` | `first_name`, `last_name` | 200 (not awaited) | `418d4` / `68abd` |
| Phone (open) | `GET /auth/users/me/` ×2 | | user | `855df` (load); `c34bc` (filling the field) |
| Phone (Submit) | `PATCH /auth/users/me/` | `phone_no` | 200 (not awaited) | `418d4` / `68abd` |
| Password | `POST /auth/users/set_password/` | `current_password`, `new_password` | < 300 | `7e945` (session); refused `38bcd` |

### Flutter source
- `screens/account/edit_name.dart`
- `screens/account/edit_phone.dart`
- `screens/account/edit_password.dart`
- `components/friendly_error_view.dart`
- `services/secure_storage.dart`: legacy purge after a password change
- `bloc/main_app/events/go_to_account_settings_edit_name_screen.dart`
- `bloc/main_app/events/go_to_account_settings_edit_phone_number_screen.dart`
- `bloc/main_app/events/go_to_account_settings_edit_password_screen.dart`
- `services/requests/user_requests.dart`: `updateUserData`, `updateUserPassword`, `setUser`

---

## 29. Delete account

Feature page: [24](docs/features/24-delete-account.md) · Spec: 11 §2.1

### User experience
1. Account settings → ⋮ → **Delete Account**. The menu closes.
2. Popup **"Delete Account"** / "You are about to delete your account. Possible data loss can occur.
   If you are sure that you want to delete your account, please enter your password." with a hidden
   password field ("Enter your password") and **Cancel** / **Delete**.
3. **Cancel** closes it.
4. **Delete**: a second popup appears on top: **"Account Successfully Removed"** / "Your account has
   been removed." **Okay** closes both → **Welcome**.
5. **Wrong password or server error**: still "Account Successfully Removed", and the user is signed
   out. The account was **not** deleted and they can log back in (Q2).
6. Session check fails before sending, or no network → the first popup just stays open.

### Behind the scenes
1. Send the delete request.
2. **Whatever the answer**, delete the refresh and access tokens, the biometric setting and the
   legacy keys.
3. Show the success popup.

The push token is **not** unregistered here (unlike Log Out).

| Call | Sends | Gets back | Fail code |
|---|---|---|---|
| `DELETE /auth/users/me/` (form body on DELETE) | `current_password` | normally 204; **not checked** | `7e945` (session) |

### Flutter source
- `screens/account/account_settings.dart`: `showAlertDialogRemoveAccount`,
  `showAlertDialogRemoveAccountSuccess`
- `services/requests/user_requests.dart`: `deleteAccount`
- `services/secure_storage.dart`

---

## 30. Help screen

Feature page: [25](docs/features/25-help-screen.md) · Spec: 11 §6

### User experience
- **Ways in**: menu → **Help**, or **Contact Support** on a flagged sensor.
- **Top bar**: ☰, logo, **X**. Then **←** and **"Help"** (very large, bold).
- Four centred lines: "Version: 1.12.5", "Build: 193", "Env: LIVE" (internal env name), "App Name:
  Cartell".
- Buttons, top to bottom:

  | Button | Colour | Opens |
  |---|---|---|
  | **Customer Support** (headset) | blue | `https://www.cartell.com/hub-support` |
  | **FAQ** (question mark) | amber | `https://www.cartell.com/hub-faq` |
  | **About Us** (info) | blue | `https://cartell.com/about/` |
  | **Send Feedback** (speech bubble) | amber | the feedback panel (Part 31) |
  | **Hub Light Guide** (satellite dish) | blue | Part 33 (**developer builds only**) |
  | **Alexa Voice Commands** (Amazon logo) | blue | Part 32 (**only if `alexa_enabled` is on**) |

- Web pages open in a browser panel **inside** the app, with a close button back to Cartell.
- **Leaving**: ← / Back → Hubs list. **X** → back one screen, to wherever the user was before (Q29).
- There is no in-app phone, email or chat support.

### Behind the scenes
- Version, build and env come from the phone.
- `GET /app/settings/?code=alexa_enabled` runs on **every redraw** (Q34).

### Flutter source
- `screens/misc/contact_us.dart`
- `components/conditional_view_widget.dart`, `components/user_feedback.dart`
- `bloc/main_app/events/go_to_contact_us_screen.dart`
- `services/requests/settings_requests.dart`: `getSetting`

---

## 31. Send feedback

Feature page: [26](docs/features/26-feedback.md) · Spec: 11 §9

### User experience
**Feedback panel** (Help → **Send Feedback**, or **Sure!** on the prompt)
- A dark grey panel slides up, covering about three-quarters of the screen (all of it at about 1.4×
  text). Tapping outside the text box hides the keyboard; tapping above the panel closes it.
- A spinner while the user's details load. Then:
  1. **"How'd We Do?"** (large, bold)
  2. five round face buttons: angry, frowning, neutral, laughing, star-struck. The chosen one turns
     amber with a bigger icon; the others are blue.
  3. a large text box "Let us know what you think of our app!"
  4. **Close** (blue): closes without sending
  5. **Submit** (amber): sends, closes, and shows a **black** toast "Thank you for your feedback!"
- A face and a comment are both optional; Submit always sends.
- If the details can't load: an orange "!" and "Something went wrong. Please try again."

**"Give Feedback" prompt**, after **Continue** on pairing success and when leaving a successful
firmware update:
- Flag on → "Give Feedback" / "Thank you for using the Cartell app! If you have a second, we'd
  appreciate any feedback you'd like to give!" (**No thanks** / **Sure!**).
  - **Sure!** opens the panel.
  - **No thanks** turns the flag off and shows a black toast "If you'd like to give feedback in the
    future, you can do so on the help screen."
- Flag off → nothing appears.
- The flag starts off, and only the developer **Reset Show Feedback** button turns it on, so store
  users never see the prompt (Q32).

### Behind the scenes
- Feedback goes to **Sentry** (`captureFeedback`), not the Cartell server:
  - name: "First Last"
  - email: the account email
  - message: `Location: Contact Us` ⏎ `User Selected: <Very Bad | Bad | Neutral | Good | Very Good | No Option Selected>` ⏎ tab `<comment>`

  Faces map left to right: Very Bad … Very Good. "Contact Us" is used even from the prompt.
- The prompt flag is `<ENV>_feedbackToken`.

| Call | Gets back | Fail code |
|---|---|---|
| `GET /auth/users/me/` (panel opens, for name and email) | user | `4aec9` |

### Flutter source
- `components/user_feedback.dart`: panel, prompt, Sentry message
- `components/friendly_error_view.dart`
- `services/secure_storage.dart`: `feedbackToken`
- callers: `screens/misc/contact_us.dart`,
  `screens/devices/connect_hub_to_wifi/widgets/success_widget.dart`,
  `screens/devices/firmware_update/update_device_screen.dart`

---

## 32. Alexa voice command guide

Feature page: [27](docs/features/27-alexa-voice-commands.md) · Spec: 11 §7

### User experience
- **Way in**: Help → **Alexa Voice Commands**, shown only when `alexa_enabled` is on.
- The Loading screen shows briefly, then:
  - **Top bar**: ☰, logo, **X**.
  - **←**, **"Alexa Voice Command Guide"**, and a small pill: green **"Connected"** if the account
    has Alexa linked, red **"Not Connected"** if not.
  - A grey info box: "Notifications will automatically be send to Alexa when a sensor is triggered"
    ("send" kept, Q8).
  - Four grey rows that **expand** when their arrow is tapped:

    | Row title | Expanded text |
    |---|---|
    | Hub Status - "Tell me about my hubs" | This command gives you information on the hubs connected to your account. |
    | Sensor Status - "Tell me about my sensors" | This command gives you information on the sensors connected to each of the hubs on your account. |
    | Last Event - "When was my last event" | This command gives information on sensors with low battery. (wrong description kept, Q8) |
    | Trigger Integrator - "Open my gates" | This command opens integrator paired to each of the hubs on your account. |

  - **Link to Cartell Skill** (full-width amber button): opens Amazon's Cartell skill page in the
    in-app browser.
- **Leaving**: ← / X → back one screen (normally Help). Android Back → **nothing** (Q28).
- If the profile can't load → Hubs list.

### Behind the scenes
- The skill link is a fixed `skills-store.amazon.com/deeplink/...` URL built into the app.
- Linking itself happens in Amazon's app or site.

| Call | Gets back |
|---|---|
| `GET /profiles/me` | `alexa_enabled`: true if the account has linked Alexa |

### Flutter source
- `screens/misc/alexa_cheat_sheet.dart`
- `components/forms/additional_info_field.dart`: the expandable rows
- `bloc/main_app/events/go_to_alexa_help_screen_state.dart`
- `utilities/constants.dart`: `alexaSkillUri`

---

## 33. Hub light guide

Feature page: [28](docs/features/28-hub-light-guide.md) · Spec: 11 §8

### User experience
- **Way in**: Help → **Hub Light Guide**, **developer builds only**. Store users see the lights only
  inside pairing.
- **Top bar**: ☰, logo, **X**. Then **"Hub Light Guide"** (very large, bold).
- Seven rows, each with an animated light on the left and its name on the right, in this order:

  | Name | Pattern (loops forever) | Meaning (not shown on this screen) |
  |---|---|---|
  | Wi-Fi Pairing Mode | light green 0.06 s, off 3 s | Waiting to be given a Wi-Fi network to join. |
  | Sensor Pairing Mode | light blue 1 s, off 1 s | Waiting for a new sensor to connect. |
  | Connected to Server | solid light green | Everything is set up correctly. |
  | Connected to Wi-Fi, But Not Server (comma kept) | solid light blue | On your network, but not reaching us. Usually that network has no internet. |
  | Not Connected to Wi-Fi | green 1 s, off 1 s, blue 1 s, off 1 s | Cannot find the network it was set up with. |
  | Resetting to Factory Defaults | red 0.1 s, off 0.1 s | Currently deleting all on-device settings. (Reset button is being held in.) |
  | Unknown Mode | solid red | Unknown state. Please call support. |

- **Return** (amber) / **X** → back one screen. Android Back → **nothing** (Q28).
- The same lights appear in pairing: step 3 and Hub reverted (Wi-Fi Pairing Mode), the Reset screen
  (Resetting), and the waiting-screen guide.

### Behind the scenes
No server calls. The patterns are drawn by the app, not read from the hub.

### Flutter source
- `screens/misc/hub_lights.dart`
- `components/hub_light_widget.dart`: patterns and timings
- `bloc/main_app/events/go_to_hub_lights_help_screen.dart`

---

# F. Platform and tooling

## 34. Platform behaviour

Feature page: [32](docs/features/32-permissions-and-platform-behaviour.md) · Spec: 18

### User experience
**Permission prompts**

| What | When asked | iOS text | If refused |
|---|---|---|---|
| Notifications | after login, every auto-login, every Hubs visit, while not granted | system default | no alerts; asked again at those moments |
| Face ID / fingerprint | when biometric unlock runs | "Cartell uses Face ID to unlock the app so you can check your property without typing your password." | Lock screen; password login still works |
| Camera | first time the QR scanner opens | "Camera permission is required for barcode scanning." | can't scan; type the MAC instead |
| Location | first **Detect Location** tap | "This app needs access to location information for storing and accessing locations of devices." | "Can't Get Location"; type coordinates |
| Local network (iOS) | when pairing first talks to the hub | "Used to connect a HUB to your network." | pairing can't reach the hub |
| Join the hub's Wi-Fi | pairing step 4, first time per hub | iOS "Join", Android "Connect" | times out with `762c844a-0` |

**Text size**: follows the phone's setting everywhere and is never capped. Layouts reflow:

| Text scale | What changes |
|---|---|
| ~1.25× | the Hubs empty card loses its width limit |
| ~1.4× | the menu hides the email; the feedback panel goes full height; firmware cards stack |
| ~1.5× | hub cards lose their width limit; label/value rows and the three-button rows stack |
| ~1.75× | event cards put the icon above the text |

**Screen reader and motion**:
- Spoken labels on icon buttons ("Back", "Show password", "Help with this step").
- Hub lights are announced by name.
- Firmware progress is announced every 10%.
- Animations respect "reduce motion".

**Rotation and size**:
- Free rotation (phones: portrait and both landscapes; iPad: all four).
- Wider than **800 px**: a permanent side rail; wider margins on Welcome, Login and pairing; extra
  padding on the sensors grid.
- Wider than **500 px**: proportional side margins on many screens; history cards centre.

**Keyboard**:
- The screen shrinks for the keyboard and scrolls.
- Login hides its logo while the keyboard is open.
- Keyboard types:
  - email (login, register)
  - name (names, sensor name)
  - phone keypad (register only)
  - plain text everywhere else, **including Edit phone and the coordinates**
- Login: "next" moves to password, "done" logs in.

**Screen edges**:
- Content stays inside the safe area.
- The dark logo bar sits under the status bar.
- Welcome, Login, Register, Lock and Hub Added have no top bar.

**iPhone vs Android**

| Area | iPhone | Android |
|---|---|---|
| Splash | solid navy | system splash, light/dark, icon on 12+ |
| Font | San Francisco | Roboto |
| Back | none; swipe-back only on the QR scanner | system Back per screen (Part 6) |
| "Leave" on Hubs | does nothing | closes the app |
| Biometrics | Face ID / Touch ID + passcode | BiometricPrompt + PIN/pattern |
| Pairing Wi-Fi prompt | "Join" | "Connect" |
| Pairing "Wi-Fi off" warning | not shown | shown, button disabled |
| Account settings switch rows | 0 px padding | 20 px padding |
| Find Sensor | Apple Maps | default maps app (`geo:`) |
| In-app browser | Safari view | Chrome Custom Tab |
| App-bar title | centred by default | left-aligned title area |
| Pushed page transition | Cupertino slide | Material page transition |
| Notification channels | — | two "Miscellaneous" |
| Analytics | none | Firebase automatic |

**Links that leave the app**

| Link | Opens |
|---|---|
| Forgot Password | `<server>/password_reset` (in-app browser) |
| Customer Support | `https://www.cartell.com/hub-support` (in-app browser) |
| FAQ | `https://www.cartell.com/hub-faq` (in-app browser) |
| About Us | `https://cartell.com/about/` (in-app browser) |
| Link to Cartell Skill | Amazon skill page (in-app browser) |
| Find Sensor | external maps app |

**Language and dates**:
- English only.
- US formats whatever the phone's language: "10-06-2026 03:07 PM" on most screens; history "10-06-2026
  3:07:45 PM" (Part 26).
- History converts to local time; "Date Paired" does not.

**App life cycle**:
- Nothing is restored after a full close.
- In the background the 15 s checks keep ticking but skip the server; pairing's waiting stage pauses
  its checks.
- No background fetch, widgets or watch app.

### Behind the scenes
- **Text scale**: thresholds use Flutter's `textScaler.scale(size)/size`, including Android 14
  non-linear scaling.
- **Physical-pixel spacing** on Welcome (Q20).
- **Links**: http(s) open in-app (url_launcher default). Maps use the exact URIs in Part 23.
- **Time**: dates are parsed as UTC and shown in local time where noted. Formatting is always en_US.

### Flutter source
- `utilities/scaling.dart`: big-font thresholds, physical-pixel helper
- `screens/events/phone_rotation_manager.dart`
- `utilities/text_formatters.dart`: date and phone formatting
- `frontend/android/app/src/main/AndroidManifest.xml`, `frontend/ios/Runner/Info.plist`,
  `frontend/ios/Runner/Runner.entitlements`
- (screen-specific behaviour lives in each part's sources)

---

## 35. Release tooling

Spec: 21 · Developer-facing; nothing here is visible to app users.

### What it does today
- **Versioning**:
  - The version is `X.Y.Z+BUILD` in `frontend/pubspec.yaml`, currently `1.12.5+193`.
  - Build numbers only go up on both stores. `store_versions.py` checks them against the stores.
- **Signing**:
  - Android uses the Play upload key from `key.properties`; its certificate SHA-256 is pinned in
    `verify_artifact.py`.
  - iOS uses team `KRP7FFWS9L`, with `ExportOptions.plist` set to
    `manageAppVersionAndBuildNumber=false`.
- **Builds**: one environment per build (test or live, via `--dart-define-from-file envs/*.json`).
- **Artifact check**: `verify_artifact.py` fingerprints the baked-in `macAddressHashKey` to prove a
  build points at the right server, and checks the signer and the minimum OS.
- **Release script** (`release.py`):
  - one environment per run, fail fast, verify before upload
  - `--skip-build --only` to recover a half-finished run
  - drives the fastlane lanes `internal`, `production` (Android) and `testflight_test`,
    `appstore_live` (iOS)
- **Release notes**: the changelog format, Play's 500-character limit, and the "(TEST SERVER)"
  suffix for test builds.
- **CI**: `flutter_code_quality.yml` runs the Flutter tests and lint, plus the Python tool tests in
  `frontend/tests/tool/`.

### Flutter source
- `frontend/tool/release.py`, `frontend/tool/store_versions.py`, `frontend/tool/verify_artifact.py`
- `frontend/android/fastlane/` (`Appfile`, `Fastfile`), `frontend/ios/fastlane/` (`Appfile`,
  `Fastfile`)
- `frontend/ios/ExportOptions.plist`, `frontend/pubspec.yaml`
- `frontend/tests/tool/` (`test_release.py`, `test_store_versions.py`, `test_verify_artifact.py`,
  `test_fastlane_lanes.py`)
- `.github/workflows/flutter_code_quality.yml`

---

## Code with no user experience (not ported)

These files exist in `frontend/lib` but no user can reach them (details in
`docs/features/A4-hidden-and-unused-features.md`):

- `screens/misc/add_location.dart`: "Add Location" screen, nothing links to it
- `screens/misc/invite_shared_user.dart`: unfinished "Share Account" screen
- `components/top_appbar.dart`: old top bar
- `components/forms/scalable_button.dart`, `components/forms/toggle_button.dart`,
  `components/icon_content.dart`: unused widgets
- `services/library.dart`: `isMobileSize`, never called
- `screens/devices/firmware_update/websocket_close_codes.dart`: abandoned WebSocket progress
- inside used files, never called:
  - `services/requests/location_requests.dart` (`addLocation`, `updateLocationData`)
  - `validateProducedDevice` and `queryHubFirmwares` in `services/requests/device_requests.dart`
  - `showInfo` in `components/teast_popups.dart`
  - the UDP messages in `udp_commands/commands/set_wifi_ssid_and_password_commands.dart`,
    `udp_commands/commands/wifi_test_commands.dart` and
    `udp_commands/commands/network_password_check_and_save.dart`
- unused packages: `showcaseview`, `firebase_auth`, `cloud_firestore`, `geocoding`,
  `flutter_dotenv` (a `.env` file is loaded but never read)
