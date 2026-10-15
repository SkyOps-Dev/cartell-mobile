# 01 — Platform Shell (Android and iOS native configuration)

Plan steps: 3.1, 3.2, 3.3, 3.4, 3.7. Sources: `frontend/android/**`, `frontend/ios/**`,
`frontend/pubspec.yaml`.

## 1. Identity

| Item | Android | iOS |
|---|---|---|
| Application id / bundle id | `com.iwatllc.cartell` (`namespace` too) | `com.iwatllc.cartell` |
| Launcher label / display name | `android:label="Cartell"` | `CFBundleDisplayName` "Cartell", `INFOPLIST_KEY_CFBundleDisplayName` "Cartell" |
| Internal name | | `CFBundleName` "cartell" |
| Version | `versionName` from pubspec (`1.12.5`), `versionCode` from `+193` | `CFBundleShortVersionString` / `CFBundleVersion` from pubspec |
| Team / signing | `key.properties` (`keyAlias`, `keyPassword`, `storeFile`, `storePassword`), release `signingConfig` | Team `KRP7FFWS9L`, automatic signing; ASC team `120077407` |
| Store tooling | fastlane `supply`, `json_key_file("fastlane/key.json")` | fastlane, `app_identifier("com.iwatllc.cartell")` |

## 2. Android

### 2.1 Gradle (`android/app/build.gradle`, `settings.gradle`, `gradle.properties`)

- Plugins: `com.android.application` 8.11.1, Kotlin Android 2.1.0, Google Services 4.4.0.
- `compileSdkVersion 36`, `ndkVersion '29.0.14033849'`, `minSdkVersion 24`,
  `targetSdkVersion flutter.targetSdkVersion`, which resolves to **36** in Flutter 3.41.9
  (`packages/flutter_tools/gradle/src/main/kotlin/FlutterExtension.kt:34`, checked
  2026-10-12), `multiDexEnabled true`.
- Java/Kotlin 17, `coreLibraryDesugaringEnabled = true`, `desugar_jdk_libs:2.1.4`.
- Dependencies: Firebase BoM `32.0.0` plus `firebase-analytics-ktx` (**analytics auto-collection
  on Android**), `androidx.appcompat:appcompat:1.7.0` (required by the AppCompat launch themes).
- Gradle wrapper 8.14. `org.gradle.jvmargs=-Xmx3000M` plus the add-opens flags.
  `android.useAndroidX=true`.

### 2.2 Manifest (`app/src/main/AndroidManifest.xml`)

Declared permissions: `ACCESS_FINE_LOCATION`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`,
`CHANGE_NETWORK_STATE`, `INTERNET`.

**Merged** permissions in the shipped build (from plugins). The RN merged manifest must end up
equivalent: `ACCESS_ADSERVICES_AD_ID`, `ACCESS_ADSERVICES_ATTRIBUTION`, `ACCESS_COARSE_LOCATION`,
`ACCESS_FINE_LOCATION`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `CAMERA`,
`CHANGE_NETWORK_STATE`, `CHANGE_WIFI_STATE`, `INTERNET`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`,
`USE_FINGERPRINT`, `VIBRATE`, `WAKE_LOCK`, `WRITE_SETTINGS`, `c2dm.permission.RECEIVE`,
`BIND_GET_INSTALL_REFERRER_SERVICE`, `gms.permission.AD_ID`, `READ_GSERVICES`,
`com.iwatllc.cartell.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. Uses-feature:
`android.hardware.wifi`.

Application: `android:label="Cartell"`, `android:icon="@mipmap/ic_launcher"`.

MainActivity:

| Attribute | Value |
|---|---|
| `exported` | `true` |
| `launchMode` | **`singleTop`** (the RN template default `singleTask` must change) |
| `theme` | `@style/LaunchTheme` |
| `configChanges` | `orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode` |
| `hardwareAccelerated` | `true` |
| `windowSoftInputMode` | `adjustResize` |
| Orientation | not restricted (rotates freely) |
| Host class | `FlutterFragmentActivity`. `local_auth`'s BiometricPrompt needs a FragmentActivity. RN's `ReactActivity` extends `AppCompatActivity`, which is a FragmentActivity, so this is satisfied. |
| Meta-data | `NormalTheme` → `@style/NormalTheme` (Flutter-specific; the equivalent is the window background after launch) |

No notification meta-data is set (`default_notification_channel_id`,
`default_notification_icon`, `default_notification_color`). Keep it that way so background FCM
notifications look the same (spec 09).

### 2.3 Themes and splash

- `values/styles.xml`: `LaunchTheme` parent `Theme.AppCompat.Light.NoActionBar`,
  `windowBackground=@drawable/launch_background`. `NormalTheme` parent
  `Theme.AppCompat.Light.NoActionBar`, `windowBackground=#FF0A0E21` (a literal, see the comment
  about the grey flash).
- `values-night/styles.xml`: the same with parent `Theme.AppCompat.NoActionBar`.
- `drawable/launch_background.xml`: a white layer-list. `drawable-v21/launch_background.xml`:
  `?android:colorBackground`. So the splash is light-theme coloured in light mode and dark in
  night mode, then `#0A0E21` once the app draws. Android 12+ shows the system splash with the
  launcher icon on top of this; capture the reference in Phase 1.5.
- No splash image is drawn on Android.

### 2.4 Icons

- Adaptive icon `mipmap-anydpi-v26/ic_launcher.xml` with background
  `@mipmap/ic_launcher_adaptive_back` and foreground `@mipmap/ic_launcher_adaptive_fore`.
- Legacy `ic_launcher.png` in mdpi through xxxhdpi (xxxhdpi is 192×192). Play Store icon
  `app/src/main/ic_launcher-playstore.png`. Copy them all byte for byte.
- `drawable/ic_launcher_background.xml` (green grid template vector) exists but is unused by the
  manifest. Copy only if the adaptive XML references it (it does not).

### 2.5 Firebase

- `app/google-services.json` (project `cartell-6307a`, number `902921870347`, package
  `com.iwatllc.cartell`). `google-services-old.json` is an unused leftover.

## 3. iOS

### 3.1 Info.plist (copy verbatim, including oddities)

| Key | Value |
|---|---|
| ` NEHotspotConfiguration` (leading space, malformed) | "Please let me connect to hub" |
| ` NEHotspotConfigurationManager` (leading space, malformed) | "Need to connect to hub" |
| `CADisableMinimumFrameDurationOnPhone` | true |
| `CFBundleDevelopmentRegion` | `$(DEVELOPMENT_LANGUAGE)` |
| `CFBundleDisplayName` | Cartell |
| `CFBundleName` | cartell |
| `CFBundlePackageType` | APPL |
| `CFBundleSignature` | ???? |
| `LSApplicationCategoryType` | "" |
| `LSRequiresIPhoneOS` | true |
| `NSFaceIDUsageDescription` | "Cartell uses Face ID to unlock the app so you can check your property without typing your password." |
| `NSCameraUsageDescription` | "Camera permission is required for barcode scanning." |
| `NSLocalNetworkUsageDescription` | "Used to connect a HUB to your network." |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | "This app needs access to location information for storing and accessing locations of devices. " (trailing space) |
| `NSLocationWhenInUseUsageDescription` | same string, with the trailing space |
| `UIApplicationSupportsIndirectInputEvents` | true |
| `UIBackgroundModes` | `remote-notification`, `fetch` |
| `UILaunchStoryboardName` | LaunchScreen |
| `UIMainStoryboardFile` | Main (a Flutter artefact; RN does not use a main storyboard, so confirm there is no visible effect) |
| `UIRequiresPersistentWiFi` | true |
| `UISupportedInterfaceOrientations` | Portrait, LandscapeLeft, LandscapeRight |
| `UISupportedInterfaceOrientations~ipad` | Portrait, PortraitUpsideDown, LandscapeLeft, LandscapeRight |
| `UIViewControllerBasedStatusBarAppearance` | false |

### 3.2 Entitlements (`Runner/Runner.entitlements`)

- `aps-environment` = development (the profile overrides it to production in distribution
  builds, which is expected).
- `com.apple.developer.networking.HotspotConfiguration` = true.
- `com.apple.developer.networking.wifi-info` = true.
- `com.apple.developer.associated-domains` = `webcredentials:cartellap.com`,
  `webcredentials:test.cartellap.com`, `webcredentials:beta.cartellap.com`. Each host serves its
  AASA from `backend/core/views.py`. iOS password AutoFill depends on this. It cannot be tested on
  the simulator.

### 3.3 Project and launch

- `IPHONEOS_DEPLOYMENT_TARGET = 15.0` (see decision D6), `TARGETED_DEVICE_FAMILY = "1,2"`,
  `SWIFT_VERSION = 5.0`, `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`.
- `Podfile`: `ios_floor = '15.0'`, `use_frameworks!`, `use_modular_headers!`, and a post_install
  that raises every pod's deployment target to the floor.
- `LaunchScreen.storyboard`: background `#0A0E21` (sRGB 0.039/0.055/0.129) with an `imageView`
  showing `LaunchImage`, centred and aspect-fit. `LaunchImage*.png` are **1×1** images, so the
  iOS splash is effectively solid `#0A0E21`. `SplashScreen*` and `SplashScreen2*` image sets
  exist but are unused.
- `AppIcon.appiconset`: copy the whole set, including `Contents.json`.
- `AppDelegate.swift` registers plugins and sets
  `UNUserNotificationCenter.current().delegate = self`, needed for foreground notification
  handling (spec 09).
- `GoogleService-Info.plist` (project `cartell-6307a`, sender `902921870347`,
  `IS_GCM_ENABLED` true). iOS does **not** link FirebaseAnalytics.
- `ExportOptions.plist`: `method app-store-connect`, `manageAppVersionAndBuildNumber false`,
  `signingStyle automatic`, `teamID KRP7FFWS9L`, `uploadSymbols true`, `stripSwiftSymbols true`,
  `destination export`, `testFlightInternalTestingOnly false`.
- `ios/TR563D534B.{cer,certSigningRequest,p12}` are signing material on disk and are gitignored
  by the root `*.p12` rule. Never copy them into `react_native_app/`.

## 2.6 Edge-to-edge and the navigation bar (found 2026-10-12)

- Targeting SDK 36, Android 15+ forces edge-to-edge on **both** apps: the app draws behind the
  status and navigation bars, and `adjustResize` no longer shrinks the window for the keyboard.
  Flutter handles both itself (insets → `MediaQuery`); RN uses `Scaffold` and
  `RevealingScrollView` in `src/components/layout/` (spec 07 §3.1 "Scaffold and the keyboard").
- With 3-button navigation Android paints a contrast strip behind the buttons, light or dark by
  the window's "light navigation bar" flag. Flutter leaves the theme's value (`false`: a dark
  strip). React Native's `WindowUtil.enableEdgeToEdge` sets it to `!isDarkMode`, which gave a
  **white** strip in light mode. It also sets the bar colour to transparent, where Flutter keeps
  the theme's black, which Android 15+ draws at 80% (measured 2026-10-13: Flutter's strip is
  (2, 3, 7) over `#0A0E21`). `MainActivity.restoreThemeNavigationBar()` puts both theme values
  back after `super.onCreate`.
- RN is edge-to-edge on every Android version (`edgeToEdgeEnabled=true` in `gradle.properties`);
  Flutter only where enforced. PARITY_ISSUES P9.

## 3.4 Plain-HTTP servers (found 2026-10-12, part 1 re-verification)

The DEVELOPMENT environment talks to a LAN backend over plain `http://` (for example
`http://192.168.100.29:8000`). The Flutter app does this with **no** cleartext setting anywhere:
the Android manifests have no `usesCleartextTraffic` or network-security config, and Info.plist
has no `NSAppTransportSecurity`. It works because Dart's `http` package opens its own sockets,
which Android's cleartext policy and iOS App Transport Security do not police.

React Native's `fetch` goes through OkHttp (Android) and NSURLSession (iOS), which **do** enforce
both. The RN app therefore needs an explicit allowance or it cannot reach a dev server at all.
Decision:
- **Android**: cleartext in **debug builds only** (the RN Gradle plugin sets
  `usesCleartextTraffic` true for debug and false for release), so the release manifest matches
  Flutter's.
- **iOS**: `NSAllowsLocalNetworking = true` in Info.plist for **all** builds (the RN template
  default). It permits plain HTTP only to local-network hosts. Making it debug-only needs
  per-configuration Info.plist handling that cannot be verified without a Mac; revisit then.
  Release builds talk only to https servers, so users see no difference.

A release build pointed at an `http://` server would fail on Android where Flutter's works; no
shipped environment does that.

**Every RN Info.plist difference from Flutter's** (the file itself cannot carry comments:
`npx react-native-asset` rewrites it and strips them):
- `NSAppTransportSecurity` / `NSAllowsLocalNetworking` (above).
- No `UIMainStoryboardFile`: RN has no Main storyboard; naming one would crash at launch.
- `CFBundleShortVersionString` / `CFBundleVersion` read `MARKETING_VERSION` /
  `CURRENT_PROJECT_VERSION` instead of `FLUTTER_BUILD_NAME` / `FLUTTER_BUILD_NUMBER`.
- `UIAppFonts` lists the bundled fonts (Flutter registers fonts itself; iOS apps outside Flutter
  must declare them).

The iOS LaunchScreen storyboard also declares an unused `tertiarySystemGroupedBackgroundColor`
resource; copy the storyboard as is. `AppIcon.appiconset` holds extra loose PNGs (`16.png` …
`1024.png`) beside the `Icon-App-*` files; copy the whole set.

## 4. Assets and fonts (`pubspec.yaml` flutter section)

- `assets/images/` is bundled whole, but **only five images are referenced** in `lib/`:

  | Image | Size | Used by |
  |---|---|---|
  | `cartelldigitalreverse.png` | 2081×977 | App bar (h45), Welcome, Login (h155), Registration (h60), Lock (h155), Load, Maintenance |
  | `HUB.png` | 2429×2013 (4.2 MB) | Hubs list card (fitWidth, h150) |
  | `Sensor.png` | 345×355 | Sensor card, Sensor view (h155), Sensor about (h200) |
  | `cartell_ct6.png` | 594×420 | Onboard sensor card and view |
  | `avatar.png` | 640×640 | Drawer header (ClipOval 90), Edit name and phone (CircleAvatar r50), Edit password (r25) |

  Unused (do not ship unless the client asks): `Product-Cluster-no-cable-trans.png`,
  `cartellbox1.jpg`, `cartelldigitalcolor.png`, `cartellwhite.png`, `favicondigital.png`,
  `icon-1*.png`, `icon-1.ai`, `logo.png`.
- Font family "Source Sans Pro": only `SourceSansPro-Regular.ttf` is bundled. Bold requests are
  synthesised by the renderer, so match that look (DESIGN.md "Real Weight Rule").
- Material icons (`uses-material-design: true`): MaterialIcons font from the Flutter SDK.
- `cupertino_icons 1.0.9`: the CupertinoIcons font. It is used through
  `CupertinoIcons.check_mark_circled_solid` in three toasts.
- `font_awesome_flutter 10.10.0`: **Font Awesome 7** Free solid (family `FontAwesomeSolid`), regular (`FontAwesomeRegular`) and brands (`FontAwesomeBrands`) fonts (`lib/fonts/Font Awesome 7 *.otf`; checked 2026-10-12). Each icon picks one font: for example `eye` and `eyeSlash` are `IconDataRegular`, `arrowRightToBracket` is `IconDataSolid`. The RN app bundles the same files, renamed to their PostScript names (`FontAwesome7Free-Solid.otf`, `FontAwesome7Free-Regular.otf`).
- `.env` is bundled as an asset but nothing reads it, so it is not ported (D11).
