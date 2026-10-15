# 02 — Configuration and Environments

Plan steps: 3.5, 7.1 (debug environment switch), 18.3. Sources: `utilities/constants.dart`,
`components/env_banner.dart`, `screens/misc/debug_menu.dart`, `main.dart`,
`frontend/envs/*.json`, `frontend/envs/README.md`.

## 1. Compile-time keys (`--dart-define-from-file=envs/<env>.json`)

| Key | Type | Default if absent | Notes |
|---|---|---|---|
| `baseDomain` | string | `cartellap.com` | host[:port], no scheme |
| `shouldUseTLS` | string `"true"`/`"false"` | `"true"` | becomes a bool via `== 'true'` |
| `sentryPublicKey` | string | `""` | the Sentry DSN. Empty means Sentry is effectively disabled. |
| `envIdentifier` | string | `"UNSET"` | `DEVELOPMENT` / `BETA` / `TEST` / `LIVE` |
| `macAddressHashKey` | string | `"???"` | HMAC key for MAC hashing (spec 17). Differs per env and is the **artifact fingerprint** (spec 21). Secret. |
| `hubAddress` | string | `192.168.4.1` | must be an IPv4 literal; `main()` throws at launch otherwise |
| `hubPort` | int | `5002` | UDP destination port |
| `hubReplyPort` | int | `6452` | UDP local bind port |
| `skipWifiHandoff` | bool | `false` | turns every Wi-Fi call in pairing into a no-op (simulator testing only) |

Env files (values shown without secrets):

| File | baseDomain | TLS | envIdentifier | extra |
|---|---|---|---|---|
| `dev.json` (gitignored) | LAN IP:8000 | false | DEVELOPMENT | |
| `dev.copy.json` (template) | `192.168.78.142:8000` | false | DEVELOPMENT | |
| `beta.json` | `beta.cartellap.com` | true | BETA | |
| `test.json` | `test.cartellap.com` | true | TEST | |
| `live.json` | `cartellap.com` | true | LIVE | |
| `simulator.json` | `localhost:8000` | false | DEVELOPMENT | `hubAddress 127.0.0.1`, `skipWifiHandoff true` |

Test and beta share a hash key; test and live do not (`tool/verify_artifact.py`).

## 2. Runtime values (`constants.dart`)

- **Mutable at runtime**: `baseDomain`, `shouldUseTLS`, `hubAddress`, `hubPort`, `hubReplyPort`,
  and `environmentName`. `environmentName` is backed by a `ValueNotifier` that `EnvBanner`
  listens to.
- Derived getters: `baseUrlHttp = (TLS ? "https://" : "http://") + baseDomain` and
  `baseUrlWs = (TLS ? "wss://" : "ws://") + baseDomain`.
- `isTestBuild = environmentName != "LIVE"`, computed **once at startup** (a top-level `var`),
  so switching environments at runtime does not change it.
- `const bool shouldUnsubFromNotifications = true` (logout deletes the Firebase token).
- `alexaSkillUri` is the long Amazon `skills-store.amazon.com/deeplink/tvt/8cced6bf…` URL. Copy it
  verbatim from `constants.dart:114`.
- `alexaEnabledAccessKey = "alexa_enabled"` is the code for `GET /app/settings/?code=`.
- `LOG_LEVEL = Level.info`, `SHOULD_LOG = true` (spec 03 §1).
- `kTextFieldDecoration` and the colours are in spec 07.
- `kHubImage` and `kSensorImage` are dead constants.

## 3. Startup sequence (`main.dart`)

1. `debugPrint` lines: `Environment Name: …`, `Domain: …`, `Should use TLS? : …`,
   `Is Sentry set up? : …`, `Hub: <addr>:<port>, replies on <replyPort>`.
2. `assertHubAddressIsSendable()` throws `StateError` if `hubAddress` is not IPv4.
3. `dotenv.load(".env")` is vestigial and not ported.
4. `SentryFlutter.init(…)` (spec 03 §2), then `innerMain`:
   - `registerServices()`: persistors, parsers, and the 15 s background auth timer (spec 04 §3).
   - `Logger.level = LOG_LEVEL`.
   - Not web: `SentryWidgetsFlutterBinding.ensureInitialized()` and `initFirebase()` (spec 09).
   - `runApp(SentryWidget(MaterialApp(debugShowCheckedModeBanner:false,
     theme: ThemeData.dark().copyWith(primaryColor: #0A0E21, scaffoldBackgroundColor: #0A0E21),
     builder: EnvBanner(child), home: AuthBlocWidget())))`.
   - There is no `routes:` table and no `onGenerateRoute`. Any `pushNamed` throws (spec 19).

## 4. EnvBanner (`components/env_banner.dart`)

- Wraps the whole app above the Navigator, so it sits over dialogs and pushed routes too.
- When `environmentName != 'LIVE'`: `Positioned(top: 0, right: 0)` with `IgnorePointer` and
  `SafeArea(bottom: false)`, a Container with padding h10 v3 and colour `Colors.red` at alpha
  0.85, and Text `'<ENV> SERVER'` (white, 11, bold, letter-spacing 1.1).
- Hidden on LIVE. It reacts to runtime environment switches. The tree shape is the same either
  way, so children keep their state.
- **Inherited text style (found 2026-10-12, Q46).** EnvBanner sits in `MaterialApp.builder`, and
  `WidgetsApp` wraps the builder's result in `DefaultTextStyle(MaterialApp._errorTextStyle)`
  (Flutter 3.41.9 `widgets/app.dart:1731`, `material/app.dart:45`). There is no `Material`
  between them, so the tag's text merges with that fallback style: it keeps white, 11, bold and
  letter-spacing 1.1 from its own style, and inherits **`fontFamily: 'monospace'`** and a
  **double underline in yellow `#FFFF00`**. Confirm against a reference screenshot.

## 5. Debug-menu environment switch (`screens/misc/debug_menu.dart`)

Only offered when `isTestBuild` (not LIVE at startup). Options (all TLS):

| Label | Domain | envIdentifier |
|---|---|---|
| Beta | `beta.cartellap.com` | BETA |
| Test | `test.cartellap.com` | TEST |
| Production | `cartellap.com` | LIVE |

Selecting one sets `baseDomain`, `environmentName` and `shouldUseTLS`, deletes the stored FCM
token **for the new environment prefix** (it runs after the reassignment), and returns to the
info view. Nothing is persisted, so a restart returns to the compiled environment. Secure-storage
keys are environment-prefixed, so a switch reads a different token set and usually leads to
signed-out behaviour on the next auth check. UI details are in spec 08 §2.
