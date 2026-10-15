# 18 — Cross-Cutting Behaviour

Plan steps: 16.1–16.8 (and every UI step). Sources: everything under `lib/`, especially
`utilities/scaling.dart`, `screens/events/phone_rotation_manager.dart`,
`components/app_scaffold.dart`, and the native shells.

## 1. Text scaling and accessibility

- The OS font size is honoured everywhere. **Nothing clamps `textScaler`.** The RN app must not
  set `maxFontSizeMultiplier` or disable font scaling.
- Reflow thresholds, using factor = `textScaler.scale(size)/size` (non-linear on Android 14+):

  | Factor | Where | Effect |
  |---|---|---|
  | > 1.4 at 18 | `isBigFont` | NavBar hides email; feedback sheet full height; firmware cards stack |
  | ≥ 1.25 at 15 | Hubs empty card | drops max width 300 |
  | ≥ 1.5 at 15 | Hubs list | drops max width 300 |
  | ≥ 1.5 at 14 | KeyValuePairDisplay, ThreeButtonRow | become columns |
  | > 1.5 at 15 | ReusableListing | becomes a column |
  | ≥ 1.75 at 15 | HistoryCard | becomes a column |

- Semantics:
  - IconButton tooltips: 'Back', 'Show password' / 'Hide password', 'Back to hub', 'Back to
    firmware', 'Help with this step'
  - HubLightWidget: image plus pattern name. 'No light' icon semantic.
  - Firmware ring: semantics label and value. Live region and announcements every 10% (spec 14).
- Reduce motion: HubLightWidget shows a static swatch; the firmware ring tween duration becomes 0.
- RoundedButton semantics: a button with its label; disabled when the handler is null (a test
  asserts this).

## 2. Orientation and window sizes

- **Not locked.** Android follows the sensor. iPhone allows portrait plus landscape left and
  right. iPad allows all four. `PhoneRotationManager().allowAll()` on the history screens sets the
  same set again.
- Breakpoints:

  | Width | Effect |
  |---|---|
  | > 800 | NavBar becomes an inline rail; the pairing scaffold uses 20% side padding; auth screens use 20% padding (> 800 for navigation versus ≥ 800 for auth margins; replicate both comparisons exactly) |
  | ≥ 800 | Sensors grid gets horizontal padding 100 |
  | > 500 | Many screens use 15% (or 10%) side padding; `ResponsiveSpacer` uses 10%; HistoryCard centres |
  | ≤ 600 | `isMobileSize` (unused) |

- `getFullScreenButtonWidth`: portrait width − 100, landscape width / 2 (`ScalableButton` only).

## 3. Keyboard

- Android `windowSoftInputMode=adjustResize`; Flutter Scaffold `resizeToAvoidBottomInset` is the
  default (true). The body shrinks and scroll views scroll within it.
- Login hides the logo block while the keyboard is visible (`viewInsets.bottom > 0`).
- Keyboard types:
  - email: Login and Registration email fields
  - name: first and last name, sensor name
  - phone: Registration phone
  - **default text**: Edit phone (no phone keyboard), coordinates, hub name, MAC
  - multiline: feedback text
- IME actions: Login email "next" → password; password "done" → submit. Other fields use the
  default.
- The feedback sheet unfocuses when tapped outside the field.

## 4. System bars and safe areas

- Screens use `SafeArea` inside the body. The app bar (`#25282A`) sits under the status bar.
  Flutter sets light status-bar icons for a dark app bar. Screens without an app bar (Welcome,
  Login, Registration, Lock, Hub added) let the status bar overlay `#0A0E21`.
- Android 15 forces edge-to-edge for targetSdk 35+. Match the inset handling and the
  navigation-bar appearance Flutter 3.41.9 produces (capture it in Phase 1.5).
- EnvBanner sits in the top-right inside the top safe area.

## 5. External links and maps

- `launchUrl(uri)` with the default mode. For `http`/`https` this opens **in-app**: Android
  Custom Tabs, iOS `SFSafariViewController` (`url_launcher_android 6.3.22` and
  `url_launcher_ios 6.3.4`, `platformDefault` branch). `showTitle` is false.

  | Link | URL |
  |---|---|
  | Forgot Password | `{baseUrlHttp}/password_reset` |
  | Customer Support | `https://www.cartell.com/hub-support` |
  | FAQ | `https://www.cartell.com/hub-faq` |
  | About Us | `https://cartell.com/about/` |
  | Link to Cartell Skill | `alexaSkillUri` (https) |

- Maps (`maps_launcher 3.0.0+1`, `launchCoordinates(lat, lng, label)`):
  - Android: `geo://ul?q=<lat>,<lng>(<label>)`. Note the query-parameter encoding in Dart's
    `Uri(scheme: 'geo', host: 'ul', queryParameters: {q})`.
  - iOS: `https://maps.apple.com/?ll=<lat>,<lng>&q=<label>`.
  - Mode: `externalNonBrowserApplication` when supported, else `externalApplication`. Build the
    URIs with identical encoding.

## 6. Locale and time

- There are no localisation delegates, so all formatting is en_US whatever the device locale.
  Dates use `intl` patterns (spec 03 §6). AM and PM are upper-case.
- Event and connection times parse as ISO-8601 and display in the device's local time zone.
- All copy is English only.

## 7. App lifecycle

- `ModeWatcher` records the lifecycle state. Maintenance probes only run while resumed and not
  pairing (spec 04 §2).
- The 15 s background auth timer keeps running while the process is alive (Dart timers pause when
  iOS suspends the app).
- `InitialConnectionWidget` re-checks Wi-Fi-enabled on resume (Android).
- The registration poller idles while backgrounded (it treats resumed and inactive as
  foreground).
- Cold start from a notification runs the normal auto-login. There is no deep linking.
- No state is restored after the process is killed; it always starts at Load → auto-login.

## 8. Copy audit method (Phase 16.8)

Extract every string literal from `frontend/lib/**/*.dart`, drop logs, Sentry codes, keys and
URLs, and check each user-visible string appears verbatim in `react_native_app/src`. Keep the
script in `react_native_app/scripts/`.

## 9. Performance characteristics worth matching

- `HUB.png` is 4.2 MB (2429×2013) and decoded for every hub card. Keep the same asset, or confirm
  with the client before optimising it, since optimising changes nothing visible but is still a
  deviation.
- Every API call is preceded by a maintenance-mode GET, which doubles latency. Replicate it.
