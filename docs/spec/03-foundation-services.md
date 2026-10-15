# 03 — Foundation Services

Plan steps: 2.4, 2.10, 4.1–4.6, 7.7, 17.1. Sources: `utilities/logging.dart`, `main.dart`,
`services/enums/result.dart`, `utilities/Exceptions/*`, `services/secure_storage.dart`,
`services/biometric_service.dart`, `utilities/device_info.dart`, `utilities/text_formatters.dart`,
`services/text_formatters.dart`, `utilities/scaling.dart`, `services/library.dart`,
`services/immediate_timer.dart`, `utilities/object_stack.dart`.

## 1. Logging

- `getLogger(name)` returns a logger that prints through `debugPrint` lines of the form
  `MM/dd/yyyy HH:mm:ss.SSS - <name> - <LEVEL> - <message>` (`DateFormat`, 24-hour clock,
  milliseconds, level name upper-cased).
- Effective level: release builds show **warning and above**; debug builds use `LOG_LEVEL`
  (info). `SHOULD_LOG=true` means the printer emits.
- `CartellLogFilter` has static allow and deny lists (empty) and throws if a name is on both.
- Logger names in use (keep them so logs are comparable): `main`, `start_services.dart`,
  `request.dart`, `NetworkHelper`, `check_creds.dart`, `hub_network_name_check.dart`,
  `models.dart`, `generic_bloc.dart`, `auth_bloc.dart`, `main_app_bloc.dart`,
  `devices_bloc.dart`, `DevicesScreen`, `device_view.dart`, `account_settings.dart`,
  `edit_coordinates.dart`, `02_sensor_connect_screen.dart`, `load_screen.dart` (used by both the
  load and maintenance screens), `UDPConnection`, and `connect_hub/events.dart` (a stale name,
  kept).

## 2. Sentry (`main.dart`)

`SentryFlutter.init` options:

| Option | Value |
|---|---|
| `environment` | `environmentName` |
| `dsn` | `sentryPublicKey` |
| `tracesSampleRate` | 0.2 release / 1.0 debug |
| `profilesSampleRate` | 0.2 release / 1.0 debug |
| `compressPayload` | true |
| `enableAppHangTracking` | true |
| `attachStacktrace`, `attachThreads` | true |
| `sendDefaultPii` | **false** |
| `debug` | not release |
| `attachScreenshot` | true, with `privacy.maskAllText` and `maskAllImages` |
| `beforeSend` | replaces `authorization` and `cookie` request headers with `[Filtered]` (case-insensitive); swallows its own errors |

Also:

- The app is wrapped in `SentryWidget`. The QR camera preview is wrapped in `SentryMask`.
- Errors are reported manually all over the app with `Sentry.captureException(<Type>("Error Code
  xxxxx:"))`. Keep each call site's code (spec 04 lists them per endpoint).
- `Sentry.captureFeedback(SentryFeedback(message, contactEmail, name))` is used by the feedback
  sheet (spec 11).
- Pairing breadcrumbs, messages and contexts are in spec 16 §8.
- Uncaught errors (zone and FlutterError) are captured by Sentry automatically. Several app paths
  rely on this, for example the `pushNamed` throw in spec 19.
- Release name default: `com.iwatllc.cartell@<version>+<build>`. Debug-symbol upload is
  configured in pubspec (`upload_debug_symbols: true`).

## 3. Result and exceptions

- `ResultStatus`: `SUCCESS` (successful), `FAILURE`, `OFFLINE` (message "Could not reach the
  server."), `NOT_SIGNED_IN` (message "You are not signed in.").
- `Result.success()`, `Result.failure({message | messages})` (if both are given, `messages`
  wins), `Result.offline()`, `Result.notSignedIn()`. `succeeded` / `failed` helpers.
- `ResultOf<T>` carries data. `.data` throws when the result did not succeed.
- Exception classes (`utilities/Exceptions/*`), each with a `cause` string:
  `RemoveSavedCredentialsException`, `NoAccountInformationFoundException` (`toString`:
  `NoAccountInformationFoundException: <cause>`), `AuthExpiredException` (`AuthExpiredException:
  <cause>`), `AccountFetchFailedException(cause, statusCode?)`
  (`AccountFetchFailedException [<code>]: <cause>` or without the code),
  `UnableToUpdateUserInformationException`, `UnableToDeleteUserAccountException`,
  `AccountInformationSetFailedException`, `StoredCredentialsException`,
  `UpdateStoredCredentialsFailedException`, `SendTokenFailedException`,
  `UpdateTokenFailedException`, `InvalidTokensException`, `FailedToAutologinException`,
  `AccountCreationFailedException`, `UnableToUpdateLocationException`, `NoUserObjectFound`,
  `HubPairingFailedException`, `FetchUpdatesFailedException`,
  `NoHubInformationAvailableException`, `UnableToUpdateExceptions`,
  `UnableToUpdateSensorEventsException`, `GenericPairToWifiException(cause, message)`,
  `ESP32UnableToGetLatestFirmware`, `RFM6601UnableToGetLatestFirmware`,
  `UnrecognizedFirmwareUpdate`, `FirmwareUpdateRejectedException`,
  `UnableToGetWifiInfoException`, `ProfileNotFoundException`, `FetchSettingsException`,
  `JsonParsingError`, `JsonStructureProblemException`,
  `TriedToConvertFromWrongJsonTypeException`, `ModelTrackingError`,
  `IdDoesNotMatchForSomeReasonException`, `TypeDoesNotMatchForSomeReasonException`.
- `services/requests/exceptions.dart`:
  - `TimeOutException.toString()` = "The request timed out. Check your internet connection and
    try again."
  - `OnHUBNetworkException.toString()` = "We detected you are on a HUB's network. Please connect
    to your own WiFi network and try again."

## 4. Secure storage (`services/secure_storage.dart`)

Backed by `FlutterSecureStorage()` with default options (version 10.3.1). Every key is prefixed
with the **current** `environmentName`:

| Key | Getter / setter | Semantics |
|---|---|---|
| `<ENV>_access` | access token | empty string reads as null |
| `<ENV>_refresh` | refresh token | empty reads as null. 180-day rotating token (per comments). |
| `<ENV>_userName` | user name | not normalised; unused in flows |
| `<ENV>_email`, `<ENV>_password`, `<ENV>_false` | delete only | legacy credentials. `purgeLegacyCredentials()` deletes password, email, then the creds-saved flag. Safe to repeat. |
| `<ENV>_fcmToken` | FCM token | empty reads as null |
| `<ENV>_feedbackToken` | show-feedback flag | stored as `"true"`/`"false"`. Missing reads as `false`. |
| `<ENV>_biometricsEnabled` | biometric opt-in | **three states**: missing or empty = never asked (null), `"true"`, `"false"` |

### 4.1 Migration facts (decision D4, spike 2.4)

- **iOS**: keychain generic-password items with `kSecAttrService =
  "flutter_secure_storage_service"` (`AppleOptions.defaultAccountName`) and `kSecAttrAccount =
  <key>`. No access group, not synchronizable, accessibility `kSecAttrAccessibleWhenUnlocked`
  (default "unlocked").
- **Android** (v10 default, custom cipher storage): values live in SharedPreferences (default
  name `FlutterSecureStorage`), encrypted with AES-GCM. The AES key is wrapped with RSA
  (OAEP default; older installs may have RSA-PKCS1 or AES-CBC, which v10 migrates on first
  access) using an AndroidKeyStore key aliased
  `com.iwatllc.cartell.FlutterSecureStoragePluginKey<suffix>`. Key-store IV prefs key
  `KeyStoreIV1`. Pre-v10 installs may hold data in `EncryptedSharedPreferences`, which v10
  migrates on read (`migrateOnAlgorithmChange` default true). Source:
  `flutter_secure_storage-10.3.1/android/src/main/java/com/it_nomads/fluttersecurestorage/`.
- Migration must preserve, per environment prefix: access, refresh, fcmToken, feedbackToken and
  biometricsEnabled. The legacy email, password and creds-saved keys are deleted, not migrated.

## 5. Biometrics (`services/biometric_service.dart`, `local_auth 2.3.0`)

- `isAvailable()` = `isDeviceSupported()` **and** enrolled biometrics are not empty. A platform
  error returns false.
- `authenticate(reason)` calls `authenticate(localizedReason, biometricOnly:false,
  stickyAuth:true, useErrorDialogs:true)`. Mapping:

  | Result | Outcome |
  |---|---|
  | true | `success` |
  | false | `failed` |
  | error `NotAvailable` / `NotEnrolled` / `PasscodeNotSet` / `OtherOperatingSystem` | `unavailable` |
  | `LockedOut` / `PermanentlyLockedOut` | `lockedOut` |
  | other error | `failed` |

- The only reason string used is `'Unlock Cartell'`. Capture the platform prompt text in
  Phase 1.5. On Android, `local_auth`'s default `AndroidAuthMessages` supply the title and
  buttons. On iOS, Face ID uses `NSFaceIDUsageDescription` and the reason string.

## 6. Helpers

- `formatDateAndTime(dt)` = `DateFormat('MM-dd-yyyy hh:mm a')`, for example `10-05-2026 03:07
  PM`. The locale is always en_US because no localisation delegates are configured.
- `formatPhoneNumber(s)`: exactly 10 digits gives `(xxx) xxx-xxxx`. Any other non-empty value is
  returned as is. Empty returns null.
- History date converter: spec 12 §1.
- `getDeviceName()`: Android `androidInfo.model`, iOS `iosInfo.modelName` (device_info_plus
  11.5.0 marketing name). `getPlatform()` returns `"Android"` or `"iOS"`. Both are sent to the
  backend on token registration.
- `scaling.dart`:
  - `getScalingFactor(size) = textScaler.scale(size)/size` (non-linear on Android 14+)
  - `bigFont(size)` = factor > 1.4
  - `isBigFont()` = factor at 18 > 1.4
  - `getFullScreenButtonWidth()` = portrait width − 100, landscape width / 2
- `isMobileSize(width ≤ 600)` is not used by any screen, but port it.
- `ImmediateTimer.periodic(duration, fn)` calls `fn` immediately, then on every period.
- `ObjectStack<T>`: `push`, `pop` and `top` throw `StateError('Stack is empty')` when empty.
  `toString` joins elements with spaces. `removeElements` is a no-op (a bug, and unused).
- `CapitalizationFormatter` upper-cases input and keeps the selection. `CharRange` is unused.

## 7. Physical-pixel layout helper

`WelcomeScreen` uses `platformDispatcher.views.first.physicalSize.height`, which is **physical
pixels**, not logical, for spacing. `DebugMenu` receives the same value for its sheet height. RN
equivalent: `Dimensions.get('window').height * PixelRatio.get()`. Confirm it is the window and
not the screen against Phase 1 references.

## 8. Device and app info

- `PackageInfo.fromPlatform()` supplies `version` and `buildNumber` (Welcome debug sheet, Help),
  and `appName` (Help: "App Name: …"). The Android label is "Cartell"; on iOS appName is
  `CFBundleDisplayName` ("Cartell"). Confirm against references.

## 9. Encryption and hashing

See spec 17.

## 10. Library mapping (candidates; finalise in Phase 2.10)

| Flutter package (locked) | Used for | RN candidate | Parity notes |
|---|---|---|---|
| flutter_bloc 8 / bloc / equatable / provider / get_it / rxdart | state, navigation, DI | in-house TS port (spec 06) | handlers run concurrently; Equatable de-duplication; back-stack |
| http 1.6 | REST | `fetch` plus AbortController | form-urlencoded bodies, 15 s timeout |
| flutter_secure_storage 10.3.1 | tokens, flags | react-native-keychain or expo-secure-store, plus a custom migration module | env-prefixed keys |
| firebase_core 3.15.2 / firebase_messaging 15.2.10 | FCM | @react-native-firebase/app, /messaging | same project |
| (gradle) firebase-analytics-ktx | Android analytics | @react-native-firebase/analytics, Android only | D8 |
| flutter_local_notifications 18.0.1 | foreground display | @notifee/react-native | channel `?` "Miscellaneous" |
| permission_handler 12.0.3 | notification permission | react-native-permissions | |
| local_auth 2.3.0 | biometric gate | expo-local-authentication or a custom module | device-credential fallback |
| geolocator 13.0.4 | Detect Location | react-native-geolocation-service plus a location-services check | exact error copy |
| maps_launcher 3.0.0+1 | Find Sensor | `Linking` with identical URIs (spec 18 §5) | external non-browser app |
| url_launcher 6.3.2 | links | react-native-inappbrowser-reborn | http(s) opens in-app by default |
| (Flutter engine: per-frame keyboard insets) | Scaffold resize, caret reveal | react-native-keyboard-controller 1.22.6 + react-native-reanimated 4.7.0 + react-native-worklets 0.13.0 | added 2026-10-13 (PARITY_ISSUES P8); Flutter needs no package because its engine does this |
| udp 5.0.3 | hub protocol | react-native-udp | bind 6452 |
| wifi_iot 0.3.19+2 | AP join, force Wi-Fi | react-native-wifi-reborn or a custom module | spike 2.2 |
| network_info_plus 6.1.4 | SSID | wifi-reborn `getCurrentWifiSSID` or netinfo | quote stripping |
| device_info_plus 11.5.0 / package_info_plus 8.3.1 | device name, version | react-native-device-info | model-name strings |
| mobile_scanner 7.4.0 | QR | react-native-vision-camera code scanner | all formats; first barcode |
| sentry_flutter 8.14.2 | errors, feedback | @sentry/react-native | same DSN and options |
| logger 2.7 / intl 0.20 | logs, dates | in-house logger plus en-US formatting | exact patterns |
| encrypt 5.0.3 / crypto 3.0.7 | AES, HMAC | @noble/ciphers / @noble/hashes (or quick-crypto) | known-answer vector |
| mask_text_input_formatter 2.9 | MAC mask | in-house | lazy autocompletion |
| modal_progress_hud_nsn 0.5.1 | HUD | in-house | read package defaults |
| flutter_spinkit 5.2.2 | spinners | in-house (Reanimated and SVG) | port the animation curves |
| liquid_pull_to_refresh 3.0.1 | pull-to-refresh | in-house | biggest custom animation |
| toastification 2.3.0 | toasts | in-house | flat style |
| badges 3.2.0 | red dots | in-house | default badge style and position |
| font_awesome_flutter 10.10.0 / cupertino_icons 1.0.9 / Material Icons | icons | bundle the same font files and use codepoints | glyph-exact |
| Material 3 widgets | everything | in-house replicas (spec 07) | resolve defaults from the SDK |
| (not used) showcaseview, firebase_auth, cloud_firestore, geocoding, flutter_dotenv | | not ported | D11 |
