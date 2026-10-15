# 14 — Firmware Updates

Plan steps: 13.1–13.3. Sources: `screens/devices/firmware_update/*`,
`bloc/devices/events/go_to_device_firmware_updates_event.dart`,
`go_to_update_device_firmware_screen.dart`, `services/requests/firmware_requests.dart`,
`firmware_update_requests.dart`, `device_requests.dart` (`startFwUpdateAndGetFileSize`).

## 1. Entering the firmware screen (`GoToDeviceFirmwareUpdatesEvent(deviceId)`)

1. Emit the loading state (LoadScreen).
2. In parallel, keeping an error listener on every future: `setDevice(id)`,
   `getLatestESP32APPFirmware()`, `getLatestRFM6601APPFirmware()`,
   `checkForRunningFirmwareUpdate(id)`. Any failure goes to the bloc error hook (recovery to
   Hubs).
3. `espUpdate = meta.esp32AppVersion! < latestESP.versionNumber! ? latestESP : null`. The same for
   RFM. **A null version throws.**
4. `currentRunning = list.isNotEmpty ? list[0] : null`.
5. Emit `IsOnDeviceFirmwareUpdatesScreen(device, espUpdate, rfmUpdate, currentRunning)`.

## 2. Firmware screen (`FirmwareUpdates`, stateless)

- `AppScaffold` (no actions). `PopScope`: if not popped → `GoToSpecificDeviceEvent(device)`.
- `Expanded → SafeArea → scroll → Column(stretch)`:
  1. Padding `fromLTRB(10,10,10,5)` Row[IconButton FA arrowLeftLong (tooltip 'Back to hub'),
     Expanded name (32, centred, maxLines 2, ellipsis), `SizedBox(48)`]
  2. 15
  3. **Current firmware card**: margin h20 v5, padding 15, `#1D1E33`, radius 20, border `#54585A`
     1 px, Column(start):
     - Heading Row[FA microchip amber 20, 10, Expanded 'Current firmware' (20, bold, white)]
     - 15
     - Two version cards:
       - Controller: FA microchip, blue `#6787B7`, `esp32AppVersion`
       - Transmitter: FA towerBroadcast, amber, `rfm6601AppVersion`
       - Side by side in an `IntrinsicHeight` Row(stretch) with 10 between, or stacked (10
         apart) when `isBigFont`
       - Each card: padding 10, fill `#111328`, radius 10, border the card colour 1 px,
         Column(start): Row[Icon 16, 5, Expanded title (14, `#A2AAAD`)], 5, then `'v<n>'` or
         `'Not reported'` (20, bold, white)
     - 15
     - Connection row:
       - Connected: FA towerBroadcast (amber, 16), 10, 'HUB connected' (14, amber)
       - Offline: FA circleExclamation (`#FF5252`), 'HUB offline — versions shown are the last
         we heard' (14, `#FF5252`)
  4. 10
  5. Then one of:
     - **Running update** (`currentUpdate.firmware != null`): a card with heading 'Update in
       progress' (FA arrowsRotate); 10; "<Controller|Transmitter> firmware is updating to v<n>.
       Keep the hub powered on." (17, `#A2AAAD`); 10; RoundedButton 'View progress' (amber,
       black, FA eye) → `GoToUpdateDeviceFirmwareScreen(device, firmware, resumeUpdateId:
       running.id)`.
     - **Updates available**:
       - Padding h35 heading '1 update available' / '<n> updates available' (FA cloudArrowUp)
       - 5
       - One card per firmware (ESP first): Row[icon 20 (controller FA microchip blue /
         transmitter FA towerBroadcast amber), 10, Column['Controller firmware' / 'Transmitter
         firmware' (17, bold, white), 5, 'v<current or ?> → v<new>' (14, `#A2AAAD`)]]; 10;
         RoundedButton 'Update now' (FA download, background blue or amber to match, black
         title and icon)
       - The button is enabled only when the hub is connected. Otherwise it is grey and shows
         'Reconnect the hub before updating.' (14, `#A2AAAD`, padding top 5) below.
       - Update now → popup "Update this hub?" / "This takes a few minutes. Keep the hub powered
         on and on WiFi. You can leave this screen while it runs, and the hub keeps its current
         firmware if the update fails." with okay "Update" (pop →
         `GoToUpdateDeviceFirmwareScreen(device, firmware)`) and cancel "Not now" (pop).
     - **Up to date**: a card with padding 20: FA circleCheck (`#69F0AE`, 40); 10; "Firmware is
       up to date" (20, bold, white, centred); 5; connected → "Both components are running the
       latest versions." / offline → "Both components were on the latest versions when the hub
       last checked in." (17, `#A2AAAD`, centred)
  6. 25
- The controller is the firmware whose `processor == 'ESP32'`.

## 3. UpdateListener (`firmware_update_listener.dart`)

- `getUpdateStream(device, firmware)` creates a single-subscription stream. Cancelling the
  subscription cancels the timer.
- `startListening(shouldStart)`:
  1. Start the stopwatch.
  2. If there is no id: when `shouldStart`, `POST update_firmware` → `fw_update_id`. An error is
     added to the stream and the method returns.
  3. `Timer.periodic(1 s, getUpdateStatus)`.
- `getUpdateStatus`:
  - Skip when there is no id or a fetch is already in flight.
  - `GET /firmware_update/{id}`. An error increments `consecutiveFetchFailures`; below 5 it is
    silent; at 5, cancel the timer and add the error to the stream.
  - On success, reset the counter and `parseEvent`.
- `parseEvent`:
  - `cursor = max(previous cursor, file_cursor)`.
  - Status: `PENDING` → Starting (code 1, "Waiting for hub"); `RUNNING` → InProgress (2,
    "Downloading"); `FAILED` → FailTimeout (3); `SUCCEEDED` → CompleteSuccess (5), set the
    device meta version to the firmware version (RFM6601 → rfm, else esp) and rebuild; other →
    `Sentry.captureMessage('FirmwareUpdate status unrecognized <update>')` + FailTimeout.
  - A terminal status cancels the timer.
  - Snapshot: `{cursor, total: file_size ?? last ?? 0, elapsed: now − date_started (or stopwatch
    ms), status}`.
- `percentageDone = total == 0 ? 0 : cursor/total`.
- `estimatedTimeLeft = p < 0.001 ? null : (1/p − 1) × elapsedSeconds`.
- `close()`: cancel the timer, close the controller, stop the stopwatch.
- The status-code enum includes unused failure codes 4, 6–12, 100 and −1 with messages like
  "Failure! Code: 2f088a11". Only 1, 2, 3 and 5 are reachable.

## 4. Update progress screen (`UpdateDeviceScreen(device, firmware, resumeUpdateId?)`)

- `initState`: `_resumeUpdateId = resumeUpdateId`, then `startUpdate()`:
  - A new `UpdateListener`; adopt the resume id.
  - Listen: each event → `setState(snapshot)` and announce.
  - On error → (post-frame) `showUpdateErrorAlert`.
  - `startListening(shouldStart: true)`.
- `AppScaffold(showNavigation: false)`, so there is no drawer or hamburger.
  `Expanded → SafeArea → PopScope` (if not popped → `_leave`) → scroll → padding 10 → Column:
  1. Left-aligned IconButton FA arrowLeftLong (tooltip 'Back to firmware') → `_leave`
  2. Progress indicator. `diameter = clamp(screenWidth − 80, 200, 300)`:
     - Succeeded: FA circleCheck (`#69F0AE`, size = diameter, semantic label 'Update complete')
     - Failed: FA circleXmark (`#FF5252`, semantic label 'Update did not finish')
     - Else: `TweenAnimationBuilder(0 → value, 800 ms linear; 0 ms with reduce motion)` showing a
       Stack of [centred "<round(pct×100)>%" (45, bold, white, tabular figures),
       `CircularProgressIndicator(value, amber, background #54585A, stroke 15, semantics label
       'Firmware update progress', value "<n>")`]
  3. 20
  4. Live region:
     - Headline (20, bold, white, centred): no status → 'Starting update'; in progress →
       'Updating firmware'; success → 'Update complete'; failure → 'Update did not finish'
     - 10
     - Padding h20 detail (17, `#A2AAAD`, centred):
       - no status: 'Keep the hub powered on.'
       - success: 'Your hub is now running v<n> and is back to watching for vehicles.'
       - failure: 'Your hub kept its previous firmware and is still working. Check that it is
         powered on and connected, then try again.'
       - in progress: 'Keep the hub powered on. You can leave this screen — the update keeps
         running.'
  5. 25
  6. Failed: padding h20 RoundedButton 'Try again' (amber, black, FA arrowsRotate) → `_retry`:
     close the listener, reset the snapshot, the announcement tenth and the resume id, then
     `startUpdate()` (a fresh POST)
  7. Not finished:
     - `KeyValuePairDisplay("Elapsed", mm:ss or hh:mm:ss, or "Calculating..." before any
       snapshot)`
     - Divider (`#54585A`, padding h20)
     - `("Remaining", ETA formatted, or "Calculating...")`
     - Divider
  8. `KeyValuePairDisplay("Version", "v<n>")`
  9. When `status.isError` (FailTimeout and the failure codes): padding top 15, 'Reference: <code
     int>' (14, `#A2AAAD`)
- Accessibility: on a terminal status, announce the headline. Otherwise announce "Firmware update
  <N> percent complete" each time a new 10% bucket is reached.
- `_leave`:
  - After success → `UserFeedback.requestUserFeedback(ctx, "Firmware Update Success", after:
    close + GoToDeviceFirmwareUpdatesEvent(deviceId))`
  - Otherwise → close + `GoToDeviceFirmwareUpdatesEvent`
- **Error dialog** (`showDialog`, standard barrier, dismissible): `AlertDialog(background
  #25282A, title Text(title), content Text(message), actions [TextButton('OK', amber)])`. OK →
  close the listener, pop, `GoToDeviceFirmwareUpdatesEvent`.

  | Error | Title | Message |
  |---|---|---|
  | `FirmwareUpdateRejectedException` | 'Cannot start update' | the server's `non_field_errors` joined |
  | `UpdateTokenFailedException` | 'Sign in again' | 'Your session expired before the update could start. Your hub is untouched. Sign in again and retry.' |
  | other | 'Lost contact' | 'We lost contact with the hub while watching the update. The update may still be running. Check that the hub is powered on and connected, then open Firmware again to see where it got to.' |
