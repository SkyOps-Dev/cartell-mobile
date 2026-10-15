# Cartell: Flutter → React Native Porting Plan

**Goal.** Build a React Native app in `react_native_app/` that a user cannot tell apart from the
shipping Flutter app (`frontend/`). That covers every screen, every word, every animation, every
notification, sign-up and login, logs and error reporting, and how it behaves on each platform.
`backend/` and `frontend/` are not modified.

**This file is the master to-do list.** Work through it top to bottom. Each step points at the
Flutter source it replaces and at the spec section (`docs/spec/`) that describes that part in
detail.

| Status mark | Meaning |
|---|---|
| `[ ]` | not started |
| `[~]` | in progress |
| `[x]` | done and verified |
| `[-]` | deliberately not done (reason recorded inline) |

---

## 1. How to work a step (repeat for every step)

Every step has the same five parts. Do not skip the first one.

1. **Re-verify the part.** Re-read every Flutter file listed under *Sources* and the linked spec
   section. If the Flutter code says something the spec does not, fix the spec first, then add
   the gap to this plan. The spec was written from a full read of the code on 2026-10-05. It is a
   map, and the Flutter code is the territory.
   Then run `npm run later -- N` (N = this part): earlier parts left markers in their own code
   for work that belongs here, and those are part of this part's job.
2. **Implement** the tasks listed.
3. **Port the tests** listed (see `docs/spec/20-tests-inventory.md`). A Flutter test is a
   behavioural contract, so the RN app has to pass its equivalent.
4. **Parity check** against the Flutter reference: screenshots and videos from Phase 1, plus the
   behaviour scenarios in the spec.
5. **Mark done** only when every *Done when* line holds on **both** Android and iOS, **and**
   `npm run later -- N` prints "nothing left".

Rules that apply everywhere (details in `docs/spec/00-index.md`):

- **As-built wins.** Copy what the Flutter app actually does, quirks included, not what
  DESIGN.md says it should do. Known bugs and quirks are listed in
  `docs/spec/19-quirks-register.md`, and each one is replicated unless the client approves a fix.
- **Code beats docs.** Where DESIGN.md or PRODUCT.md disagree with `lib/`, `lib/` is the
  reference. For example, the firmware screen was recomposed after DESIGN.md described it.
- **No improvements.** Do not fix, restyle, or "clean up" anything during the port. Log ideas in
  the quirk register for the client to decide on later.
- **Optimise the code, never the behaviour.** The RN app must look and behave exactly like the
  Flutter app: nothing added, nothing removed. *How* the RN code achieves that should be as
  efficient as we can make it, and the more efficient the better. Any optimisation is fine as long
  as the user cannot see a difference, and it is checked on the phone against Flutter. Practices
  and measurements: `docs/PERFORMANCE.md`. (Set by the developer, 2026-10-13.)
- **Great code, not just fast code.** Performance never comes at the cost of code that is easy to
  find, read and change. Shared look lives in one place (`src/theme/` colours and typography,
  `src/components/icons/`), reusable pieces are components (`src/components/…`, mirroring
  Flutter's own shared widgets), folders and files are organised by what they are, and names
  say what a file, component or function does. Someone opening the project should be able to
  tell from the tree and the names how the app is put together. When the fastest option and the
  clearest option differ, find one that is both, or take the clear one and measure.
- **Measure, don't guess.** Any visual value not written in `lib/` (Material 3 defaults, library
  defaults) is taken from the Flutter 3.41.9 SDK or package source at the locked version, or
  measured from reference screenshots.
- **Same strings, same Sentry error codes, same API calls in the same order.**
- **Mark everything left for a later part.** When a part deliberately leaves out something that
  a later part builds (a Flutter step, a state, a screen, a test), write
  `// LATER(part N): <what Flutter does here>` at the exact spot it will go, using the timeline's
  part numbers. `npm run later` lists them all by part, so nothing a part skipped is forgotten
  when its turn comes.

---

## 2. Baseline being copied

| Item | Value |
|---|---|
| Flutter app version | `1.12.5+193` (`frontend/pubspec.yaml`) |
| Flutter / Dart | 3.41.9 (FVM) / Dart ^3.11 |
| Snapshot reviewed | 2026-10-05 working tree (`c:\src\cartell\cartell-main`, not a git checkout) |
| Size | 266 Dart files / 26,932 lines in `lib/`; 77 test files / 574 tests |
| Bundle / package id | `com.iwatllc.cartell` (iOS team `KRP7FFWS9L`) |
| Firebase project | `cartell-6307a` |
| Environments | dev (LAN), beta, test, live, simulator (`frontend/envs/*.json`) |

**Change tracking.** If `frontend/` changes after this baseline, for example a bug fix or a new
release, add a step to Phase 20 for that change. Port it only after the baseline work is done.

---

## 3. Decisions to confirm before Phase 2

Each has a recommended default. Record the answer and the date.

- [ ] **D1 Parity standard.** Replicate as-built behaviour, including every item in the quirk
  register, unless the client approves a fix per item. *Default: replicate.*
- [ ] **D2 Distribution.** The RN app ships as an **update to the same store listings**
  (`com.iwatllc.cartell` on both stores, same Play upload key, same Apple team, same Firebase
  project). D4, Phase 19 and the version-number rules all depend on this. *Default: yes.*
- [ ] **D3 Dev variant for side-by-side comparison.** Add a development-only variant
  (`com.iwatllc.cartell.rn`) so the Flutter and RN apps can be installed on one phone at once.
  It needs a Firebase app registration for the suffixed id, which is a client action in the
  Firebase console. *Default: yes.*
- [ ] **D4 Session continuity.** Users upgrading from Flutter stay signed in. The RN app migrates
  tokens and preferences written by `flutter_secure_storage` 10.3.1 (spec 03 §4). Without this,
  every user is logged out once, which is a visible difference. *Default: yes.*
- [ ] **D5 Framework.** Bare React Native (community CLI), TypeScript, Hermes, New Architecture.
  This gives full control of the native shells, which must match byte for byte. The alternative
  is Expo with prebuild and config plugins. *Default: bare RN.*
- [ ] **D6 iOS minimum version.** Flutter supports iOS 15.0. Current React Native requires a
  higher floor (check at Phase 3, likely 15.1 or later), so iPhones still on 15.0.x could not
  install the update. *Default: accept RN's floor and tell the client.*
- [ ] **D7 Platforms.** Android and iOS phones and tablets only. The Flutter `web/`, `linux/`,
  `macos/` and `windows/` folders are template scaffolds that are not shipped. *Default: not
  ported.*
- [ ] **D8 Firebase Analytics.** Today only Android collects analytics automatically
  (`firebase-analytics-ktx` in `android/app/build.gradle`). Keep that: collection on Android,
  none on iOS. *Default: yes.*
- [ ] **D9 Sentry.** Use the same DSN, environments and release naming
  (`com.iwatllc.cartell@<version>+<build>`). Add a non-visible tag `framework: react-native`.
  *Default: yes.*
- [ ] **D10 Debug-only features.** Anything gated by `kDebugMode` is ported behind `__DEV__`
  (Hub Light Guide button, Verify Sentry, Reset Show Feedback, RSSI row, QR wifi-password
  scanner, websocket-URI verification stages 2–3). *Default: yes.*
- [ ] **D11 Dead code.** Not ported: `AddLocation`, `InviteSharedUser`, `TopAppBar`,
  `websocket_close_codes.dart`, `teast_popups.showInfo`, and the unused packages `showcaseview`,
  `firebase_auth`, `cloud_firestore`, `geocoding` and `flutter_dotenv`. *Default: not ported,
  and recorded in the coverage matrix.*
- [ ] **D12 Visual tolerance.** Layout, colour, copy, icons and animation timing must match. The
  Material 3 ink ripple (InkSparkle on Android) and sub-pixel text rasterisation are matched as
  closely as RN allows, then signed off by the client. *Default: agree this with the client in
  writing.*
- [ ] **D13 Quirks.** Walk the client through `docs/spec/19-quirks-register.md` and record
  "replicate" or "fix" for each row. *Default: replicate all.*

---

## 4. Phase overview and why it is in this order

| # | Phase | Why here | Exit criteria |
|---|---|---|---|
| 0 | Ground rules and access | Nothing can be verified without credentials, devices and a fixed baseline | Decisions recorded, access collected |
| 1 | Reference capture | Every later UI step is judged against these | Screenshot/video set and theme-token table complete |
| 2 | Risk spikes | De-risks the native capabilities that could block the port before 80% of it exists | Every spike has a working proof or a written fallback |
| 3 | Scaffold and native shell | Icons, name, splash, permissions and entitlements must be identical from the first build | App installs, looks identical before JS renders |
| 4 | Core logic (no UI) | Pure logic can be ported test-first against the Flutter tests | All core unit tests green |
| 5 | Design system and components | Every screen is built from these | Component gallery matches the reference |
| 6 | State and navigation engine | The Flutter app navigates by bloc state with its own back-stack, which every screen depends on | Engine tests green, Back map verified |
| 7 | Auth and session | The entry point of the app | Login, registration, auto-login, lock, logout, maintenance all match |
| 8 | Push notifications | Needs a signed-in session; it is the product's main job | Foreground and background notifications match |
| 9 | Main shell and hubs | The home screen everything hangs off | Hubs list, detail, settings, about, rename, delete match |
| 10 | Account and help | Uses the shell and components only | All account and help screens match |
| 11 | Event history | Three screens sharing one card | Paging, pull-to-refresh, rotation match |
| 12 | Sensors | Depends on hubs | List, detail, edit, coordinates, add-sensor wizard match |
| 13 | Firmware updates | Depends on hubs; long-running polling | All firmware states match |
| 14 | Add hub | QR camera, MAC mask, hashing | Add-hub flow matches |
| 15 | Hub pairing | Hardest part and most dependencies: UDP, Wi-Fi handoff, a 24-state machine | Simulator and real-hub verification pass |
| 16 | Cross-cutting sweep | Catches anything that only shows across screens | Accessibility, orientation, keyboard, links, locale verified |
| 17 | Observability parity | Sentry and Analytics data must keep flowing the same way | Event shapes match |
| 18 | Release engineering | Same identity and signing; safe build pipeline | Signed test and live builds verified |
| 19 | Upgrade and final acceptance | Proves "indistinguishable" end to end | Client sign-off |
| 20 | Post-baseline Flutter changes | Keeps the port in step with any Flutter fixes | Empty, or every item ported |

---

## 5. The checklist

### Phase 0 — Ground rules and access

- [ ] **0.1 Confirm decisions D1–D13** (§3) with the client. Record answers in §3.
- [ ] **0.2 Freeze the baseline.** Record the exact `frontend/` snapshot: version `1.12.5+193`,
  the date, and a hash of `frontend/lib`, `frontend/android`, `frontend/ios` and
  `frontend/pubspec.lock`. Agree with the team that Flutter changes after this go to Phase 20.
- [ ] **0.3 Collect access** (never commit any of it; see the root `.gitignore`):
  - [ ] Play upload keystore and `key.properties` (`secrets/android-signing/`), Play
        service-account JSON for fastlane
  - [ ] Apple team `KRP7FFWS9L` access, App Store Connect API key (`ASC_KEY_ID`,
        `ASC_ISSUER_ID`, `ASC_KEY_PATH`), provisioning for `com.iwatllc.cartell` (and `.rn` if D3)
  - [ ] Firebase console access to `cartell-6307a`, `google-services.json`,
        `GoogleService-Info.plist`
  - [ ] Sentry org, project, DSN and auth token for symbol and source-map upload
  - [ ] `envs/{beta,test,live}.json` values (including `macAddressHashKey` and
        `sentryPublicKey`)
  - [ ] Test accounts on test and beta (create through the API; see `frontend/CLAUDE.md`)
  - [ ] Devices: an Android 10+ phone, an Android 14+ phone, an iPhone, an iPad or Android
        tablet (needed for the >800 px layout), and at least one physical hub
        (`48:27:e2:b1:94:44`-class, firmware 1025) plus the `backend/hubload` simulator

### Phase 1 — Reference capture (the yardstick)

Spec: `docs/spec/23-screen-catalogue.md`, `docs/spec/07-design-system.md`.

- [ ] **1.1 Install the Flutter baseline** (test environment) on the reference Android phone and
  iPhone, and on the tablet.
- [ ] **1.2 Capture reference screenshots** of every catalogue entry (screens, states, dialogs,
  menus, toasts, sheets, OS prompts):
  - [ ] Android and iOS at default text size, portrait
  - [ ] Android and iOS at large text (≈1.5× and 2.0×), because layouts reflow at 1.4, 1.5 and
        1.75
  - [ ] Landscape for the screens that allow it (the app is not orientation-locked)
  - [ ] Tablet wider than 800 px (navigation rail instead of drawer)
- [ ] **1.3 Record reference videos** of every motion: the 300 ms cross-fade between screens,
  drawer open/close and edge-swipe, dialog enter/exit, popup menus, toasts, liquid
  pull-to-refresh, SpinKit spinners, hub-light blink patterns, the firmware progress ring, the
  pairing countdown, keyboard open/close on every form, and the Android Back behaviour on every
  screen.
- [ ] **1.4 Resolve the theme tokens.** Fill the "resolved defaults" table in spec 07 §3 from the
  Flutter 3.41.9 SDK source (`ThemeData.dark()` with Material 3) for every stock widget the app
  uses: AppBar, Drawer, ListTile, Divider, Switch, outlined and underline InputDecorator, FAB,
  IconButton, TextButton, ElevatedButton, MaterialButton, PopupMenu, AlertDialog, Scrollbar,
  Circular and Linear progress indicators, Tooltip, default text styles. Optionally confirm with
  a throwaway debug harness that prints `Theme.of(context)`. Do not commit the harness.
- [ ] **1.5 Capture platform behaviour**: launch splash (Android light and dark, iOS), launcher
  icon and name, Recents entry, permission prompts and their timing (notifications, camera,
  location, local network, Face ID), the OS Wi-Fi join prompt (Android "Connect", iOS "Join"),
  biometric prompt text on both platforms, the autofill save prompt after login, the keyboard
  type per field, how notifications look in foreground and background, and the Android
  notification-channel list ("Miscellaneous" appears twice; see spec 09).

### Phase 2 — Risk spikes (throwaway proofs; decide libraries)

Spec: `docs/spec/03-foundation-services.md` §10 (library candidates). Build in a sandbox RN app,
not in `react_native_app/`.

- [ ] **2.1 UDP.** Bind `0.0.0.0:6452`, send to `192.168.4.1:5002`, receive replies on Android
  and iOS, including the iOS local-network permission. Test against the hub or `hubload`.
- [ ] **2.2 Wi-Fi handoff.** Join `Cartell Hub <MAC>` (WPA, `family12`, join-once, no internet),
  force traffic onto Wi-Fi, disconnect, `isEnabled`, `isConnected`. Android 10+ uses
  `WifiNetworkSpecifier` and iOS uses `NEHotspotConfiguration`. Compare against
  `wifi_iot 0.3.19+2`, including which prompt appears.
- [ ] **2.3 SSID read** for the hub-network check (parity with `network_info_plus 6.1.4`:
  permission needs, quote stripping, iOS entitlement).
- [ ] **2.4 Session migration.** From RN native code, read the values `flutter_secure_storage
  10.3.1` wrote: on iOS, keychain service `flutter_secure_storage_service` with account = key;
  on Android, the `FlutterSecureStorage` SharedPreferences decrypted through the
  `com.iwatllc.cartell.FlutterSecureStoragePluginKey` keystore key (spec 03 §4). Prove it by
  installing the Flutter build, logging in, then installing the RN build over it with the same
  signature.
- [ ] **2.5 Fonts and icons.** Render glyphs from the exact font files the Flutter app bundles:
  Font Awesome 7 (not 6) from `font_awesome_flutter 10.10.0`, MaterialIcons from the Flutter 3.41.9 SDK,
  CupertinoIcons from `cupertino_icons 1.0.9`, and Source Sans Pro Regular. Compare against the
  reference screenshots.
- [ ] **2.6 Text metrics.** Confirm RN text can match Flutter's Material 3 default text style
  (body 14/20, letter-spacing 0.25, height multiplier carried into overrides) and line heights.
  Confirm a way to compute Flutter's `textScaler.scale(size)/size`, including Android 14
  non-linear font scaling, for the 1.4, 1.5 and 1.75 reflow thresholds.
- [ ] **2.7 Biometrics** with device-credential fallback, sticky auth, error dialogs, and an
  error-code mapping equal to `local_auth 2.3.0` (`biometricOnly:false`). Match the prompt
  strings on both platforms.
- [ ] **2.8 Autofill.** Save the credential to the password manager only on successful
  login/registration and never on failure, the equivalent of
  `TextInput.finishAutofillContext(shouldSave:true)` plus `AutofillGroup` cancel-on-dispose.
  Android: `AutofillManager.commit()/cancel()`. iOS: decide the approach.
- [ ] **2.9 Custom animation feasibility**: liquid pull-to-refresh (`liquid_pull_to_refresh
  3.0.1`), SpinKit Ring, Pulse and FadingFour (`flutter_spinkit 5.2.2`), and toastification's flat
  toast (2.3.0), using Reanimated and react-native-svg.
- [ ] **2.10 Freeze the library list** and pin the versions. Record the final choice per row in
  spec 03 §10.

### Phase 3 — Scaffold and native shell

Spec: `docs/spec/01-platform-shell.md`, `docs/spec/02-config-and-environments.md`.

- [ ] **3.1 Create the app** in `react_native_app/` using bare RN and TypeScript (pinned). If the
  CLI refuses a non-empty folder, initialise in a temp folder and move it in, keeping
  `PORTING_PLAN.md` and `docs/`. Set the package/bundle id to `com.iwatllc.cartell`, the display
  name to "Cartell", and the iOS `CFBundleName` to "cartell". Add the dev variant if D3 is yes.
- [ ] **3.2 Android shell parity** (copy values exactly from spec 01 §2):
  - [ ] Declared permissions (5), plus confirm the merged manifest equals the Flutter merged list
  - [ ] `MainActivity`: `singleTop` (the RN template uses `singleTask`, so change it),
        `adjustResize`, the full `configChanges` list, `exported`, hardware accelerated, a
        FragmentActivity-compatible host for biometrics
  - [ ] `LaunchTheme` and `NormalTheme` (AppCompat parents, `#FF0A0E21` literal),
        `launch_background.xml` (both variants), values-night
  - [ ] Adaptive icon (`ic_launcher_adaptive_back/fore`), legacy mipmaps, Play Store icon
  - [ ] minSdk 24, compileSdk 36, targetSdk matched, Java 17, core-library desugaring, AppCompat
        dependency, Google Services plugin, Firebase BoM and Analytics (D8)
  - [ ] Signing config from `key.properties`; versionCode continues **above 193**
  - [ ] No `default_notification_channel_id`, icon or colour meta-data (Flutter sets none; see
        spec 09)
- [ ] **3.3 iOS shell parity** (spec 01 §3):
  - [ ] Info.plist keys and usage strings **verbatim**, including the two malformed
        leading-space `NEHotspotConfiguration*` keys, background modes `remote-notification` and
        `fetch`, `UIRequiresPersistentWiFi`, orientations (iPhone portrait plus landscape
        left/right, iPad all four), `UIViewControllerBasedStatusBarAppearance=false`,
        `CADisableMinimumFrameDurationOnPhone`
  - [ ] Entitlements: `aps-environment`, HotspotConfiguration, wifi-info, associated domains
        `webcredentials:` for the cartellap.com, test. and beta. hosts
  - [ ] LaunchScreen storyboard (`#0A0E21` with the 1×1 LaunchImage), AppIcon set copied
  - [ ] Deployment target (D6), device family 1,2, team, `ExportOptions.plist` with
        `manageAppVersionAndBuildNumber=false`, Podfile floor raise
  - [ ] `UNUserNotificationCenter` delegate wiring equivalent to `AppDelegate.swift`
- [ ] **3.4 Assets and fonts.** Copy the five images the code uses (`cartelldigitalreverse.png`,
  `HUB.png`, `Sensor.png`, `cartell_ct6.png`, `avatar.png`), Source Sans Pro Regular, and the
  icon fonts from 2.5. Build `<FAIcon>`, `<MaterialIcon>` and `<CupertinoIcon>` components keyed
  by the Flutter codepoints.
- [ ] **3.5 Environment system** mirroring `envs/*.json`: keys `baseDomain`, `shouldUseTLS`,
  `sentryPublicKey`, `envIdentifier`, `macAddressHashKey`, plus `hubAddress`, `hubPort`,
  `hubReplyPort` and `skipWifiHandoff` with the same defaults. Make env selection a build-time
  choice, keep `baseDomain`, `shouldUseTLS` and the env name mutable at runtime for the debug
  menu, and refuse to start on a non-IPv4 `hubAddress`. Never commit env files with secrets. The
  vestigial `.env` asset is not ported (D11).
- [ ] **3.6 Tooling**: TypeScript strict, ESLint, Prettier, Jest and React Native Testing
  Library, a `.gitignore` that covers secrets, and `.github/workflows/react_native_quality.yml`
  path-filtered to `react_native_app/**` (lint, format check, typecheck, tests). Add RN hooks to
  the root `.pre-commit-config.yaml` without touching the backend and frontend hooks.
- [ ] **3.7 Shell parity check**: install side by side and compare icon, name, splash (Android
  light and dark mode, iOS), status bar, and the window background behind the first frame
  (`#0A0E21`).

### Phase 4 — Core logic, ported test-first (no UI)

Spec: `docs/spec/03`, `04`, `05`, `17`.

- [ ] **4.1 Logger**: the `MM/dd/yyyy HH:mm:ss.SSS - <name> - LEVEL - msg` format, info level in
  debug, warning+ in release, allow/deny lists. *Sources:* `utilities/logging.dart`,
  `utilities/constants.dart`.
- [ ] **4.2 Sentry init parity**: environment, DSN, traces and profiles 0.2 in release / 1.0 in
  debug, compressed payload, app-hang tracking, attach stacktrace and threads,
  `sendDefaultPii=false`, debug in dev, screenshot with text and image masking, `beforeSend`
  scrubbing `authorization` and `cookie` headers, camera preview masked, and feedback API.
  *Sources:* `main.dart`, `components/forms/qr_scanner.dart`, `components/user_feedback.dart`.
- [ ] **4.3 Result types and exceptions.** Port `Result` and `ResultOf` (statuses and messages)
  and every exception class, including `toString()` text where tests assert it. *Sources:*
  `services/enums/result.dart`, `utilities/Exceptions/*`, `services/requests/exceptions.dart`.
- [ ] **4.4 Secure storage**: environment-prefixed keys (`<ENV>_access`, `_refresh`, `_userName`,
  `_fcmToken`, `_feedbackToken`, `_biometricsEnabled`, plus the legacy `_email`, `_password` and
  `_false` purge), empty→null, three-state biometrics, `purgeLegacyCredentials`. Add the
  **migration module** from spike 2.4, which runs once before first read. *Sources:*
  `services/secure_storage.dart`.
- [ ] **4.5 Helpers**: `formatDateAndTime` (`MM-dd-yyyy hh:mm a`, en_US always),
  `formatPhoneNumber`, the HistoryCard date converter, physical-pixel height helper,
  `getScalingFactor`, `bigFont`, `isBigFont`, `getFullScreenButtonWidth`, `isMobileSize`,
  `ImmediateTimer`, `ObjectStack`, `CapitalizationFormatter`, device name and platform strings.
  *Sources:* `utilities/*`, `services/immediate_timer.dart`, `services/library.dart`,
  `services/text_formatters.dart`, `utilities/device_info.dart`.
- [ ] **4.6 Crypto**: AES-128-CBC with no padding into a 64-byte UTF-8 field (fixed key and IV),
  `fieldBytesRemaining`, the error text with the byte count and never the value, and
  HMAC-SHA256 MAC hashing. Must pass the known-answer vector in spec 17 §3. *Sources:*
  `services/encryption.dart`, `services/hash_mac_address.dart`.
- [ ] **4.7 Models and cache**: manual JSON parsing with the same defaults and the same
  non-merged fields (spec 05), and `DataPersistor` with identity-preserving merge plus change
  notifications that screens subscribe to. *Sources:* `models/*`,
  `services/data/data_persistor.dart`, `utilities/start_services.dart`.
- [ ] **4.8 HTTP core**: `NetworkHelper` (maintenance probe before **every** request, hub-SSID
  check, `JWT` auth header, form-urlencoded bodies, 15 s timeouts, exact exception mapping),
  `AuthorizedRequester` (401 → force refresh → retry once; offline vs expired),
  `AuthRequestManager` (60 s cache, single-flight, verify then refresh with rotating tokens,
  offline short-circuit), and the 15 s background auth timer. *Sources:* `services/request.dart`,
  `services/requests/networking.dart`, `auth_gateway.dart`, `auth_requests.dart`,
  `authorized_requester.dart`, `hub_network_name_check.dart`, `utilities/start_services.dart`.
- [ ] **4.9 Every API function** in spec 04 §5, with the same URLs (including trailing-slash
  quirks), bodies, status handling, Sentry error codes and thrown exceptions. *Sources:*
  `services/requests/*.dart`, `services/auth_manager/check_creds.dart`.
- [ ] **4.10 Mode watching**: `ModeWatcherHelper` (lifecycle state from AppState,
  `isPairingDevices`, listeners) and `ModeDebouncer` (immediate group changes; two agreeing
  probes to switch between maintenance and unreachable). *Sources:* `utilities/AppWatchers/*`.
- [ ] **4.11 UDP protocol and connection**: packet layout, checksum, all 15 message types,
  routing, NUL-terminated string decoding, the `UDPConnection` singleton (bind waits, clear
  races, listener-copy broadcast), and the send destination check. Verify byte for byte against
  `backend/hubload/udp_protocol.py`. *Sources:* `udp_commands/**`.
- [ ] **4.12 Port the core tests** listed for 4.1–4.11 in spec 20 (services, udp, utilities,
  auth requests, network helper, secure storage, encryption, result, debouncer, watcher).

### Phase 5 — Design system and shared components

Spec: `docs/spec/07-design-system.md`. Each item is checked against the Phase 1 references.

- [ ] **5.1 Tokens and text.** Port the palette constants, `kTextFieldDecoration`, and a `<Text>`
  that reproduces Flutter's ambient default style (Material 3 bodyMedium merge semantics, white,
  14/20, letter-spacing 0.25; overrides keep the height multiplier) plus the platform font
  (Roboto on Android, San Francisco on iOS). Note `DefaultTextStyle(style: TextStyle())`
  resets inside the Cupertino sheets.
- [ ] **5.2 Buttons**: `RoundedButton` (pill, elevation 5, 45 px tall, minimum width 200, Gravel
  when the handler is null, ripple shape per spec 07), `RoundedLoader` (350 px wide), Material 3
  `IconButton`, `TextButton`, `ElevatedButton` (including the default lavender), the FAB
  (Material 3 default 16 px radius), the transparent start-top back FAB on auth screens,
  `ToggleButton`, `ScalableButton`.
- [ ] **5.3 Inputs**: the outlined pill field (floating label, hint, `errorText` and `error`
  widget, error border, amber 1 px/2 px border), the default Material 3 underline field (Wi-Fi
  password), obscure toggles, the `maxLength` counter, `TextFieldWithPostChangeValidators`
  (including its focus-gain latch quirk), the MAC mask `XX:XX:XX:XX:XX:XX` (lazy, hex,
  uppercase).
- [ ] **5.4 Switch**: Material 3 Switch with `activeThumbColor` amber, exact track, outline and
  thumb sizes and states; `AutoSwitch` optimistic toggle → revert plus toast;
  `SynchronizedAutoSwitch`.
- [ ] **5.5 Dialogs**: `showPopupMessage` (layout, buttons, inferred cancel, barrier not
  dismissible, enter/exit animation), the Material 3 `AlertDialog` (firmware errors), and the
  bloc message stream → `drawMessage` (PopupError, PopupNotification, PopupDialog, "Whoops").
- [ ] **5.6 Toasts**: the toastification flat replica (top-centre, 50 px top margin, DarkGray,
  white icon and text, 5 s, fade, drag to close, `dismissAll` before showing) and the
  "teast" top-banner dialog (4 s).
- [ ] **5.7 Cupertino modal sheet**: `showCupertinoModalPopup` and `CupertinoPopupSurface`
  replica (slide-up, barrier, rounded blur surface, tap-outside dismiss).
- [ ] **5.8 Progress and animation**: Material 3 Circular (indeterminate and determinate) and
  Linear indicators, SpinKit Ring, Pulse and FadingFour, the `ModalProgressHUD` overlay,
  `HubLightWidget` (seven patterns, timer chain, reduce-motion static swatch), and the tweened
  progress ring.
- [ ] **5.9 Layout primitives**:
  - [ ] `AppScaffold`: 56 px app bar, wordmark title rules (Android left-aligned title area with
        `Center`; iOS `centerTitle` default true; measure), actions, drawer at ≤800 vs rail at
        >800, `showNavigation:false`, the body-in-Row rule
  - [ ] `NavBar`: Material 3 drawer with DarkGray background, `UserAccountsDrawerHeader`,
        30 px FA icons, dividers, scrim, edge-swipe, close-before-dispatch, email hidden at big
        font, "Unable to get current user…" fallback
  - [ ] `PopupMenuButton` (Material 3 menu with ListTile items), `ListTile`, `Divider`,
        `Scrollbar` with visible thumb
  - [ ] `KeyValuePairDisplay`, `ReusableCard`, `ReusableListing`, `IconButtonRowEntry`,
        `ThreeButtonRow`, `ResponsiveSpacer`, `AdditionalInfoField`, `SensorFlaggedBanner`,
        `HubStatusGlyph`, `FriendlyErrorView`, `ConditionalViewWidget`, `badges.Badge` replica,
        `EnvBanner`
- [ ] **5.10 Pull-to-refresh**: the `TimedPullToRefresh` liquid replica (amber on `#25282A`,
  height 40, animSpeedFactor 5, waits 2 s before calling refresh).
- [ ] **5.11 Component gallery** (dev-only screen) with screenshot comparison against the
  references. Port the component tests (spec 20 §components).

### Phase 6 — State and navigation engine

Spec: `docs/spec/06-state-and-navigation.md`.

- [ ] **6.1 Port `GenericBloc`**: per-type handlers running **concurrently** (flutter_bloc 8
  default), `emit` and `emit.isDone`, Equatable-equal state de-duplication, error hook,
  non-poppable states kept off the stack, same-type replacement on top, `popState(n)` that pops
  n+1 and re-emits, and the fallback state. *Sources:* `bloc/shared/*`,
  `utilities/object_stack.dart`.
- [ ] **6.2 `emitThenRefresh` and `RefreshState`** (checking → ready/failed, superseded-screen
  guard, `AuthExpired` rethrow).
- [~] **6.3 Routers**: the three nested bloc hosts (Auth → MainApp → Devices) with the 300 ms
  `AnimatedSwitcher` cross-fade (both children layered during the fade), a new DevicesBloc per
  Hubs render, the message-stream popups, and the throw on unknown state. *Sources:*
  `screens/bloc_widgets/*`, `main.dart`, `utilities/bloc_popups.dart`.
  *2026-10-15:* all three hosts built (`AuthRouter`, `MainAppRouter`, `DevicesRouter`) with the
  states the Hubs screen needs; the other states arrive with their screens (`npm run later`).
- [~] **6.4 Back behaviour.** Implement the per-screen Android Back map (spec 06 §7): auth
  screens exit the app, Hubs asks "Leave App", most screens dispatch their "go back" event, and
  some do nothing. Disable iOS swipe-back on bloc screens while keeping it on pushed routes.
  *2026-10-15:* `PopScope` + `PageBackHandler` (the page route's rule); Hubs' "Leave App"; menus
  and dialogs take Back first; the drawer never does (Q52).
- [ ] **6.5 Pushed routes**: the QR scanner and the standalone FailureWidget with the platform's
  default MaterialPageRoute transition in Flutter 3.41.9 (verify the Android builder in the SDK;
  iOS uses the Cupertino slide).
- [~] **6.6 Port the engine tests** (`emit_then_refresh`, `go_to_hubs_screen_event`,
  `recovery_after_close`, `auth_state` equality, navbar wiring and dismissal).
  *2026-10-15:* `go_to_hubs_screen_event` (one case waits for part 20), `recovery_after_close`,
  navbar wiring and dismissal ported.

### Phase 7 — Auth and session

Spec: `docs/spec/08-auth-and-session.md`.

- [~] **7.1 Load, Welcome, Debug menu**: (part 11, 2026-10-14: the Debug menu, Test Connection
  and the environment switch built and tested; the FCM token delete is LATER(part 14); side by
  side on the phone pending, PARITY_ISSUES P18.) Physical-pixel spacing on Welcome, PackageInfo, the
  "Open Debug Info" Material 3 default button, the Debug sheet (version, build, env, Test
  Connection with its four checks, `__DEV__` buttons, Change Environment on non-LIVE builds only,
  the environment picker with its warning box, FCM token delete on switch). *Sources:*
  `screens/welcome/load_screen.dart`, `welcome_screen.dart`, `screens/misc/debug_menu.dart`.
- [~] **7.2 Auto-login**: (part 10, 2026-10-13: Loading screen and the event built and tested,
  Loading screen measured on Android against Flutter; the biometric gate and LockScreen are
  marked LATER(part 9), push-token steps LATER(part 14); iOS not checked yet) purge legacy keys (own guard) → access-token check → biometric gate
  (success, unavailable→clear pref, lockedOut→lock with message, failed→lock) → up to three
  `autoLoginMethodOnTheLoadScreen` attempts (auth, notification init, FCM validate, hub health
  queries, user fetch) → MainAppBloc plus `fetchDevices` → Hubs. Any throw goes to Welcome.
  Add the `LockScreen`. *Sources:* `bloc/auth/events/auto_login_event.dart`,
  `services/auth_manager/check_creds.dart`, `screens/welcome/lock_screen.dart`.
- [ ] **7.3 Login**: the screen (autofill group with cancel on dispose, field order and IME
  actions, logo hidden while the keyboard is open, error dismissal and re-arm, the HUD while
  submitting, back disabled while submitting, Forgot Password opening the in-app browser at
  `/password_reset`) and the event (empty guard, 401 and ≥300 popups, autofill commit on success
  only, token storage, FCM, user fetch, the one-time biometric offer dialog, devices, Hubs).
  *Sources:* `screens/welcome/login_screen.dart`,
  `bloc/auth/events/attempt_logging_in_event.dart`.
- [ ] **7.4 Registration**: live email and password validation (exact messages and red
  `#FF5252`), the confirm field appearing and clearing, phone field, submit; the event (mismatch
  popup, 201 → autofill commit plus the swapped-title success popup → Login with email; 300–499
  `buildErrorMessage`; 5xx; the swapped timeout popup). *Sources:*
  `screens/welcome/registration_screen.dart`,
  `bloc/auth/events/attempt_registration_event.dart`.
- [~] **7.5 Logout**: (part 12, 2026-10-14: the event, its dialog, the token deletes and the
  "Could Not Sign Out" path built and tested, run from the placeholder's button; FCM steps are
  LATER(part 14), the biometrics preference LATER(part 9), the side-menu entry LATER(part 6).)
  Confirm dialog → FCM unregister (`DELETE register_device`) and Firebase `deleteToken` →
  delete refresh then access (on failure, "Could Not Sign Out") → best-effort FCM token, legacy
  purge, biometric pref → Welcome. *Sources:*
  `bloc/auth/events/attempt_log_out_event.dart`, `components/navbar.dart`.
- [~] **7.6 Maintenance and unreachable**: (part 13, 2026-10-14: built and tested; maintenance
  screen measured on Android against Flutter, wrench, text and Retry within 3 px; iOS not checked
  yet) ModeWatcher listener → debouncer → maintenance
  screen (two copies, Retry re-probes) → back to NORMAL triggers a full auto-login, including
  the biometric prompt. *Sources:* `screens/bloc_widgets/auth_bloc_widget.dart`,
  `screens/welcome/maintenance_mode_screen.dart`,
  `bloc/auth/events/maintenance_mode_event.dart`.
- [~] **7.7 Biometric service parity**: (part 9, 2026-10-14: local_auth's native code ported for
  both platforms as CartellLocalAuth, BiometricService, the gate in auto sign-in, the Lock screen,
  the one-time offer after login and the clean-up on log out, built and tested; Android checked by hand
  on the phone with no difference found, iOS to build on a Mac; the Account Settings switch is LATER(part 21).) Availability
  rule (supported and enrolled), outcomes, the prompt reason "Unlock Cartell", platform prompt
  texts.
- [ ] **7.8 Port the tests**: login (17), registration (10), lock (3), maintenance (7), auth bloc
  wiring (12), login and registration wiring, biometric gate, biometric service and preference,
  legacy purge (14), auth state equality.

### Phase 8 — Push notifications

Spec: `docs/spec/09-notifications.md`.

- [ ] **8.1 Firebase init**: a background handler that only logs; data-only (silent) messages
  produce nothing visible in any app state.
- [ ] **8.2 Foreground display**: show title and body through a local notification on channel id
  `?`, name "Miscellaneous", max importance, default sound, notification id always 0 (a new one
  replaces the old), small icon `@mipmap/ic_launcher`. On iOS, present with sound and no
  duplicate system banner.
- [ ] **8.3 Background and terminated display**: the OS shows the FCM notification on the FCM
  fallback channel (also named "Miscellaneous") with the app's default icon. Tapping it only
  opens the app; there is no deep link.
- [ ] **8.4 Permission and token lifecycle**: request notification permission at the same points
  (login, auto-login, every Hubs mount via `fullLogin`, FCM validate), `getToken`, store per
  environment, `onTokenRefresh` → re-register when signed in, register (`token`, `device_name`,
  `platform`), validate, and delete on logout.
- [ ] **8.5 End to end**: send backend test notifications (`send_test_notification`) to both apps
  in foreground, background and killed states on both platforms, and compare.

### Phase 9 — Main shell and hubs

Spec: `docs/spec/10-hubs.md`.

- [~] **9.1 MainAppBloc and NavBar**: all states and events, `GoToHubsScreenEvent` sending a live
  DevicesBloc home, error recovery (force auth → AutoLogin, or go to Hubs).
  *2026-10-15:* built with the loading and Hubs states; the side menu with its header and five
  entries, of which only Log Out dispatches (the developer's call); the user comes from a stand-in
  for `DataPersistor<User>` (the cache is put off). Drawer, tablet rail, hamburger.
- [~] **9.2 Hubs list** (`DevicesScreen`): title block (Source Sans Pro), empty card, one-column
  grid of square cards (HUB.png or warning icon, status row, blacklisted-sensor badge), FAB,
  ellipsis "Add Hub", pull-to-refresh (silent `RefreshDevices`), the "Leave App" Back dialog,
  `fullLogin` on every mount, DevicesBloc recovery with 1/2/3 s backoff.
  *2026-10-15:* built: title block, empty card (always, for now), FAB and ⋮ menu (both do nothing
  yet), "Leave App", DevicesBloc with its recovery. Left: hub cards, pull-to-refresh (part 24),
  `fullLogin` (part 14), Add Hub (part 29).
- [ ] **9.3 Hub detail** (`DeviceView`): menu (Rename, About, Check for updates, Delete Hub in
  red), the delete dialog flow, flagged banner, `HubStatusGlyph` with checking, ready and failed
  states, the two-column action grid with its enable rules, the Open Gate toast,
  pull-to-refresh, "Last Updated".
- [ ] **9.4 Hub settings**: five synchronized switches with the exact success and failure
  messages (including the copy bug in Integrator), the Pair Integrator button when enabled, the
  always-visible scrollbar.
- [ ] **9.5 About hub and Rename hub** (MAC, versions shown as "null" when missing, Last Updated
  recomputed every build; rename waits for the PATCH).
- [ ] **9.6 Port the tests** (navbar, emit-then-refresh-driven screens).

### Phase 10 — Account and help

Spec: `docs/spec/11-account-and-help.md`.

- [ ] **10.1 Account settings**: skeleton first, then user and profile; Connected Services
  (Alexa, gated by `app/settings?code=alexa_enabled`); listing rows with amber dividers; the
  biometrics row visibility rule; notification and email switches; the Delete Account flow
  (menu → password dialog → always-success popup → Welcome); Back → Hubs.
- [ ] **10.2 Edit name, phone and password** (fire-and-forget PATCH for name and phone; the
  password flow with validation, confirm field, HUD, and success, mismatch and generic error
  popups).
- [ ] **10.3 Help** (version block, four buttons with alternating colours, in-app browser links,
  Send Feedback sheet, debug Hub Light Guide, conditional Alexa button), **Alexa cheat sheet**,
  **Hub light guide**, **User feedback** (prompt gate via stored flag, faces, Sentry
  `captureFeedback` message format, toasts).
- [ ] **10.4 Port the tests** (edit password, friendly-error usage).

### Phase 11 — Event history

Spec: `docs/spec/12-event-history.md`.

- [ ] **11.1 HistoryCard** (icon per type, label always red, local date format with the custom
  AM/PM rules, "Connected to …" line, reflow at 1.75, centring when wider than 500).
- [ ] **11.2 All, hub and sensor history screens**: initial checking spinner, infinite scroll at
  max extent, trailing loader, pull-to-refresh, error view (hub history shows the raw error
  text), rotation allowed, X and Back targets.

### Phase 12 — Sensors

Spec: `docs/spec/13-sensors.md`.

- [ ] **12.1 Sensors list** (grid of 0, 1 or 2 columns, empty card, FAB, ellipsis "Pair Sensor",
  pull-to-refresh, Back → hub).
- [ ] **12.2 Sensor detail** (menu, delete, flagged banner → Help, image by type, battery states,
  three-button row with maps launch, notifications switch, Pair Sounder banner toast, Last
  Updated).
- [ ] **12.3 About sensor, Rename sensor, Edit coordinates** (location-services and permission
  flow with four exact messages, high-accuracy fix, `formatCoordinate`, validation popup).
- [ ] **12.4 Add-sensor wizard** (name with 32-character counter → remove case → connect:
  pairing mode on, 60 s count, a 1 s check that the hub is connected, new sensor found by id,
  PATCH with name, pairing mode off, success and failure views, Cancel).
- [ ] **12.5 Port the tests** (edit sensor, format coordinate, flagged banner, sensor view wiring).

### Phase 13 — Firmware updates

Spec: `docs/spec/14-firmware.md`.

- [ ] **13.1 Firmware screen**: the four fetches run concurrently, then the current-firmware card,
  side-by-side or stacked at big font, the connection row, and either the running update, the
  update offers (disabled when offline), or the up-to-date card; the confirm dialog.
- [ ] **13.2 Update progress**: `UpdateListener` (POST or resume, 1 s poll without overlap, five
  tolerated failures, status mapping, local version bump on success); the screen (ring and
  percentage, headlines, details, Elapsed and Remaining, Try again, Reference code, the three
  error dialogs, accessibility announcements every 10%, feedback prompt on leaving after
  success).
- [ ] **13.3 Port the tests** (available updates 12, listener 21, update screen 3).

### Phase 14 — Add hub

Spec: `docs/spec/15-add-hub.md`.

- [ ] **14.1 Add hub screen and its bloc** (QR block, manual MAC link, the editable and
  non-editable MAC field, the warn dialog, the Submit enable rule, `RoundedLoader`, lowercase
  MAC → HMAC → `POST /locations/{id}/devices/`, error popups and messages, the empty-field
  toast quirk, the re-run-last-event quirk, the init-failure path).
- [ ] **14.2 QR scanner** (camera permission, black background, bottom overlay states,
  auto-return on a valid scan, duplicate suppression, Sentry masking).
- [ ] **14.3 Hub added screen** (no app bar; proceed to pairing or later).

### Phase 15 — Hub pairing (Wi-Fi provisioning)

Spec: `docs/spec/16-hub-pairing.md`, `docs/spec/17-udp-protocol-and-crypto.md`.

- [ ] **15.1 Native Wi-Fi handoff module** from spike 2.2, with `HubWifi` wrapper semantics and
  `skipWifiHandoff` no-ops.
- [ ] **15.2 `HubConnectionBloc`**: all 21 events and 24 states, the flags (`teardownInFlight`,
  `reconnectInFlight`, `abandonRequested`), `TimerManager`, `close()` cleanup,
  `ModeWatcherHelper` flag handling at every terminal path.
- [ ] **15.3 Connection and verification**: join → 500 ms → force Wi-Fi → 500 ms → socket;
  GetFWVersion at 2/s for 40 s; websocket URI written three times (now, 120 ms, 240 ms);
  Wi-Fi scan every 10 s until results arrive; the verification-timeout copy (approval word per
  platform); socket-exception branches.
- [ ] **15.4 Credentials and teardown**: encrypted SSID and password every 4 s, the two bail-out
  codes, a single advance on ack, then 2 s / 1 s / 1 s / 1 s teardown and the confirmation poll.
- [ ] **15.5 Confirmation stage**: `HubRegistrationPoller` (backoff tiers, clamp to the probe due
  time, background idling, auth-expired after three failures), the one-shot access-point probe
  at 60 s after the ack, `ErrorOccurredEvent` teardown with the 90 s reachability window,
  `ReestablishConnectionToServerEvent`, cancel and abandon semantics.
- [ ] **15.6 Pairing screens** (19 widgets plus `PairingStepScaffold`): step numbering, exit
  button and Back sharing one confirm path ("Stop Pairing?"), help FABs and dialogs, all copy,
  the elapsed clock, light readings, and the outcome screens.
- [ ] **15.7 Sentry parity**: breadcrumbs, the `GenericPairToWifiException` captures, and the
  `hub pairing registration poll ended: <outcome>` summaries with the same context fields.
- [ ] **15.8 Port the pairing tests** (210 tests across 24 files, counted 2026-10-07; spec 20 §pairing).
- [ ] **15.9 Verify against the simulator** (`envs/simulator.json` equivalent plus
  `backend/hubload` responder) on the iOS simulator and Android.
- [ ] **15.10 Verify against a real hub** on Android and iOS using
  `frontend/docs/superpowers/DEVICE-VERIFICATION-427.md`: correct password, wrong password
  (revert detected), cancel at every step, Back at every step, fresh install (OS join prompt),
  leaving the screen mid-poll, server unreachable after teardown.

### Phase 16 — Cross-cutting parity sweep

Spec: `docs/spec/18-cross-cutting.md`.

- [ ] **16.1 Accessibility**: OS font scale is never clamped; reflow thresholds (1.25, 1.4, 1.5,
  1.75) match; tooltips and semantics labels; the live region and announcements; reduce motion.
- [ ] **16.2 Orientation and size**: rotation allowed (Android unrestricted, iPhone portrait and
  landscape, iPad all), the >800 rail, the >500 paddings, tablets.
- [ ] **16.3 Keyboard**: `adjustResize`-equivalent behaviour, scroll-into-view, keyboard types,
  return-key actions, the login logo hidden while the keyboard is open.
- [ ] **16.4 System bars**: status bar icon brightness under the app bar, Android 15
  edge-to-edge insets, navigation bar colour, safe areas.
- [ ] **16.5 Links**: http(s) opens in-app (Android Custom Tabs, iOS SFSafariViewController), as
  `url_launcher 6.3.2` does by default; maps open externally using the exact `maps_launcher`
  URIs; the Alexa skill deep link.
- [ ] **16.6 Locale and time**: en_US formatting whatever the device locale; UTC → local
  conversion matches.
- [ ] **16.7 Lifecycle**: background and foreground effects (mode probes paused, timers), cold
  start from a notification, the process being killed mid-flow.
- [ ] **16.8 Copy audit**: script-extract every user-visible string literal from `frontend/lib`
  and confirm each appears verbatim in the RN source.

### Phase 17 — Observability parity

Spec: `docs/spec/03-foundation-services.md` §2, `docs/spec/16-hub-pairing.md` §8.

- [ ] **17.1 Sentry**: compare the events the two apps send in a test environment (errors with
  the same "Error Code xxxxx" markers, messages, breadcrumbs, feedback, contexts, user,
  release); upload source maps and native symbols.
- [ ] **17.2 Firebase Analytics**: Android automatic events match; iOS sends none (D8).

### Phase 18 — Release engineering

Spec: `docs/spec/21-release-and-tooling.md`.

- [ ] **18.1 Versioning**: one source of truth (`X.Y.Z+BUILD`) continuing from 1.12.5+193; build
  numbers strictly increase across both stores.
- [ ] **18.2 Signing**: the same Play upload certificate (SHA-256 in
  `frontend/tool/verify_artifact.py`) and the same Apple team, bundle id and capabilities.
- [ ] **18.3 Environment builds and verification**: test and live builds; EnvBanner; an artifact
  verifier for RN builds (fingerprint the baked `macAddressHashKey`, signer, minimum OS).
- [ ] **18.4 Release tool and fastlane**: one environment per run, fail fast, verify before upload,
  recoverable `--skip-build --only`; lanes `internal`, `production`, `testflight_test`,
  `appstore_live`; port the Python tool tests.
- [ ] **18.5 Release notes process** (changelog format, Play 500-character limit, "(TEST SERVER)"
  suffix).

### Phase 19 — Upgrade path and final acceptance

- [ ] **19.1 Upgrade test**: install the Flutter release, sign in, enable biometrics, receive a
  notification, then install the RN build over it. Confirm the session is kept, the biometric
  gate is honoured, notifications still arrive, and no duplicate notification channels appear.
  Do this on both platforms.
- [ ] **19.2 Full screenshot diff** of the screen catalogue (both platforms, text sizes,
  orientations, tablet).
- [ ] **19.3 Full scenario matrix**: happy paths and every error path in the specs and quirk
  register, on physical devices against the test server.
- [ ] **19.4 Performance and stability**: cold start, memory, a long pairing poll, a
  multi-minute firmware update, background and resume.
- [ ] **19.5 Client sign-off**, rollout plan (staged), and rollback plan (re-release the Flutter
  build at a higher build number).
- [ ] **19.6 Docs**: a `react_native_app/` CLAUDE.md and README, the root `CLAUDE.md` monorepo
  table, and `project/CLAUDE.md` notes.

### Phase 20 — Flutter changes after the baseline

For each change: re-run `node react_native_app/docs/spec/tools/generate-coverage-matrix.js`
(it fails on any new unmapped file), update the affected spec, and add an item here.

- [ ] *(none yet; add one item per Flutter change merged after the baseline)*

---

## 6. Where the details live

| Spec | Covers |
|---|---|
| [00-index](docs/spec/00-index.md) | Conventions, parity rules, glossary |
| [01-platform-shell](docs/spec/01-platform-shell.md) | Android and iOS native configuration, permissions, icons, splash, entitlements |
| [02-config-and-environments](docs/spec/02-config-and-environments.md) | Env keys and files, runtime-mutable config, EnvBanner |
| [03-foundation-services](docs/spec/03-foundation-services.md) | Logging, Sentry, Result, secure storage and migration, helpers, crypto, library mapping |
| [04-networking-and-api](docs/spec/04-networking-and-api.md) | NetworkHelper, auth manager, the full endpoint contract |
| [05-models-and-cache](docs/spec/05-models-and-cache.md) | JSON models and DataPersistor semantics |
| [06-state-and-navigation](docs/spec/06-state-and-navigation.md) | GenericBloc, all blocs, states and events, routers, the Back map |
| [07-design-system](docs/spec/07-design-system.md) | Tokens, Material 3 defaults to resolve, every shared component |
| [08-auth-and-session](docs/spec/08-auth-and-session.md) | Welcome to logout, biometrics, autofill, maintenance |
| [09-notifications](docs/spec/09-notifications.md) | FCM and local notifications, permission, token lifecycle, backend payloads |
| [10-hubs](docs/spec/10-hubs.md) | Hubs list, detail, settings, about, rename |
| [11-account-and-help](docs/spec/11-account-and-help.md) | Account, edit screens, Help, Alexa, hub lights, feedback |
| [12-event-history](docs/spec/12-event-history.md) | The three history screens |
| [13-sensors](docs/spec/13-sensors.md) | Sensors and the add-sensor wizard |
| [14-firmware](docs/spec/14-firmware.md) | Firmware screen and update progress |
| [15-add-hub](docs/spec/15-add-hub.md) | Add hub, QR scanner, hub added |
| [16-hub-pairing](docs/spec/16-hub-pairing.md) | Pairing state machine, poller, probe, screens |
| [17-udp-protocol-and-crypto](docs/spec/17-udp-protocol-and-crypto.md) | Packet format, message types, AES and HMAC |
| [18-cross-cutting](docs/spec/18-cross-cutting.md) | Accessibility, orientation, keyboard, links, locale, lifecycle |
| [19-quirks-register](docs/spec/19-quirks-register.md) | As-built bugs and quirks, decision column |
| [PARITY_ISSUES](docs/PARITY_ISSUES.md) | Places the RN copy does not yet match Flutter, found while testing; fixed before Phase 19 |
| [20-tests-inventory](docs/spec/20-tests-inventory.md) | All 77 Flutter test files mapped to RN steps |
| [21-release-and-tooling](docs/spec/21-release-and-tooling.md) | Release pipeline, fastlane, verification, CI |
| [22-file-coverage-matrix](docs/spec/22-file-coverage-matrix.md) | **Every Flutter file → the step that ports it** |
| [23-screen-catalogue](docs/spec/23-screen-catalogue.md) | Every screen, state, dialog, toast and prompt, with IDs for screenshots |
| [tools/generate-coverage-matrix.js](docs/spec/tools/generate-coverage-matrix.js) | Regenerates spec 22; exits non-zero if any Flutter file is unmapped |

**Feature guide.** [`docs/features/`](docs/features/README.md) describes the same app by
feature and use case (what the user sees, every interaction, server calls, failures), in plain
language and in user-journey order. Use it to understand a part before working on its step; the
specs above remain the build-level reference.

**Feature parts.** [`PORTING_PARTS.md`](PORTING_PARTS.md) splits the app into 35 parts.
For each part it gives the user experience, what happens behind the scenes (endpoints, what is
sent and received), and the Flutter source files. Every one of the 266 `lib/` files is listed.

**Timeline.** [`PORTING_TIMELINE.md`](PORTING_TIMELINE.md) lists the build sequence (38 parts, each
using only parts above it) with tentative days per part.
