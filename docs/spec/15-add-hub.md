# 15 — Add Hub, QR Scanner, Hub Added

Plan steps: 14.1–14.3, 6.5. Sources: `screens/devices/add_device/**`,
`components/forms/qr_scanner.dart`, `components/forms/text_field_with_post_change_validators.dart`,
`components/rounded_loader.dart`, `services/hash_mac_address.dart`,
`services/text_formatters.dart`.

## 1. AddDevice screen (Devices state `IsAddingAHubState`)

- Owns an `AddDeviceBloc` (its own flutter_bloc) with name and MAC text controllers.
  `bloc.context` is set on every build.
- `AppScaffold(actions: [SizedBox(50)])`. `PopScope`: Back → `GoToDevicesHomeScreen`.
- Body: `BlocProvider → Expanded → SafeArea → LayoutBuilder → padding h (width > 500 ? 15% : 15)
  → scroll → Column(start) → Column(centre)`:
  1. 25
  2. Left-aligned back arrow → `GoToDevicesHomeScreen`
  3. 'Enter Hub Information' (24, bold)
  4. 50
  5. A tappable QR block: amber fill, radius 10, padding `fromLTRB(40,20,40,20)`, containing
     `Icons.qr_code_scanner_rounded` (160, black), 20, "Tap To Scan QR Code" (black). Tap →
     `AddDeviceStartScanningEvent`.
  6. 50
  7. Fields by state:
     - **Initial**: `TextFieldWithPostChangeValidators` (label 'Hub Name', validator → "Device
       name cannot be empty.")
     - **ShowingMacAddressField**: the Hub Name field, 25, then padding bottom 25 → a
       `GestureDetector(onTap → AddDeviceWarnAboutEditingEvent)` around the MAC field:
       - `enabled: macAddressEditable`
       - formatters: `CapitalizationFormatter` + `MaskTextInputFormatter('XX:XX:XX:XX:XX:XX',
         X = [0-9a-fA-F], lazy)`
       - label 'Mac Address'
       - `errorText`: 'Mac Address cannot be empty' when `!validMacAddress` (always valid in
         practice)
       - validator → "Mac address cannot be empty."
     - Other states: `SizedBox(h73)`
  8. Submit, rebuilt on name and MAC changes and on bloc state:
     - `!isLoading` → RoundedButton 'Submit' (amber, `#25282A`, FA circleCheck, padding bottom
       25). Enabled iff both name and MAC are non-empty, else grey (`#A2AAAD`).
       → `AddDeviceSubmitEvent(mac)`
     - `isLoading` → `RoundedLoader()` (350 wide, amber, white spinner)
  9. When not showing the MAC field: a tappable Text "Tap to Add Mac Address Manually" (blue) →
     `AddDeviceShowMacAddressEvent(isEditable: mac is empty)`

## 2. AddDeviceBloc events

- **Dispatch**: every event except Submit is stored as `lastRanEvent`. `handle` is not awaited,
  so later emits happen after the handler "completes". That works in release builds; in debug an
  assertion fires.
- **Init** (in the constructor): `profile = setProfile()`, `locationID =
  profile.locations[0].id`. On `Exception`: Sentry, `Navigator.of(context).pop()` (pops the root
  route!), then `AddDeviceErrorEvent(code "15b12a", message "An error occurred while adding a
  hub. If this continues to happen contact support.")`, which **pushes `FailureWidget` as a
  MaterialPageRoute**. That widget needs the pairing providers, so the screen breaks. Spec 19.
- **StartScanning**: `scanQrCode(title 'Scan Hub QR Code', loadingPrompt 'Please scan the QR code
  on the hub', invalidScanPrompt 'That does not seem to match a QR code on a hub', returnPrompt
  'Tap to use hub QR code', isBarcodeValid: regex ^([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}$)`.
  `returnBarcode(value)`:
  - matches the regex → `AddDeviceScannedMacAddressEvent(mac, true)`
  - `'-1'` → ignore
  - else → `ScannedMacAddress("", false)` + popup "Failed to validate hub" / `err ?? "This hub
    couldn't be validated. Please try again and contact support if the issue persists."`
  - A `PlatformException` is caught.
- **ScannedMacAddress**: set the MAC text, then emit `ShowingMacAddressField(validName,
  validMacAddress: true, macAddressEditable: false, isLoading, canSubmit: validName)`.
  `validName` is never updated, so it stays false.
- **ShowMacAddress(isEditable)**: emit `ShowingMacAddressField(editable: isEditable, canSubmit:
  false)`.
- **WarnAboutEditing**: popup "Change Mac Address" / "The Mac Address of your hub has already been
  scanned. Are you sure you'd like to change it?" with a single Okay → pop + emit editable.
  Tapping the field area while it is editable also raises this popup.
- **Submit(mac)**:
  1. `isLoading = true`, then re-add `lastRanEvent` (re-renders with the loader; it **re-runs
     that event**, so after a Warn it shows the popup again).
  2. Empty MAC or name → toast "Make sure you enter a Name and valid Mac Address before
     submitting" (`#54585A`, FA circleXmark). **`isLoading` stays true** and the loader
     persists. This is unreachable from the enabled button.
  3. Otherwise: `mac.toLowerCase()` → `hashMacAddress` (HMAC-SHA256 hex with
     `macAddressHashKey`) → `POST /locations/{locationID}/devices/ {name, mac_address: hash}`:
     - < 300 → decode `id` → `setDevice(id)` → `GoToAddHubSuccessScreen(device)`
     - 300–499 → `err = ""` + `" \n" + msg` for each `non_field_errors` item (only when present)
       → `isLoading = false`, re-add → popup "Adding Hub Failed" / `err ?? "An Error occurred.
       Please try again."`
     - ≥ 500 → `err = 'Failed to add hub. Please try again. If the problem persists, please
       contact support.'` → the same popup
  4. `err` is **static**, so it persists across attempts and screens.
- The unused dialog "Error scanning QR code." / "There was an issue scanning the QR code. Please
  make sure you have the correct QR code and try again." is not wired up.

## 3. QR scanner (`scanQrCode` → `MobileScannerSimple`, a pushed MaterialPageRoute)

- `Scaffold(appBar: AppBar(title: Text(title)))` uses the **Material 3 default app bar**: surface
  colour from `ColorScheme.dark()`, the default back arrow and title style. Resolve these in
  Phase 1.4. Background black.
- `Stack[SentryMask(MobileScanner(onDetect)), bottom overlay]`. The overlay is centred at the
  bottom, height `screenHeight/4`, padding `fromLTRB(5,20,5,0)`, colour rgba(0,0,0,0.7):
  - No barcode yet: 60×60 amber spinner, 15, `loadingPrompt`
  - Valid: FA circleCheck (60, amber), 15, RoundedButton(`returnPrompt`, amber, `#25282A`) →
    `returnBarcode`. A valid detection auto-returns and pops immediately, so this view barely
    shows.
  - Invalid: FA x (60, amber), 15, `invalidScanPrompt`, 15, RoundedButton 'Clear scan' (blue) →
    clears it
- `onDetect`: take the first barcode. Ignore it when its raw value equals the current one.
  `setState`. If valid and non-null → `returnBarcode(raw)` + `Navigator.pop`.
- Camera permission is requested by mobile_scanner on start (`NSCameraUsageDescription`; Android
  `CAMERA`). Capture the denied-permission behaviour in Phase 1.5.
- The Wi-Fi password QR (debug only) uses the same scanner with title 'Scan WiFi Password',
  loading 'Find QR WiFi Password', return 'Use WiFi Password', and no validator.

## 4. Hub added (`SuccessfullyAddedDeviceScreen(device)`, state `IsOnAddHubSuccessScreen`)

- A plain `Scaffold` (**no app bar**, no drawer). `PopScope`: Back → `GoToSpecificDeviceEvent`.
- `SafeArea → scroll → padding h (width > 500 ? 15% : 0) → Column`:
  1. 65
  2. "Hub Added to Account!" (20, white, bold, centred)
  3. 20, then FA circleCheck (150, amber)
  4. 20, then "Your hub is now added to your account." (16, centred, padding h14)
  5. 20, then "Next, we will pair the hub to your Wi-Fi. Are you ready to proceed?" (16)
  6. 20, then padding h20 RoundedButton 'Proceed and Pair To Wi-Fi' (amber, black, FA check
     `#25282A`) → `GoToConnectHubBloc(device)`
  7. 10, then padding h20 RoundedButton 'Pair to Wi-Fi Later' (blue, black) →
     `GoToSpecificDeviceEvent(device)`
