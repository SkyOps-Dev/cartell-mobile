# 13 — Sensors

Plan steps: 12.1–12.5. Sources: `screens/sensors/**`, `components/sensors/sensor_card.dart`,
`components/sensor_ellipsis.dart`, `components/teast_popups.dart`,
`services/requests/sensor_requests.dart`.

## 1. Sensor card (`SensorCard(sensor, device)`)

- `badges.Badge(showBadge: sensor.isBlacklisted, padding 0, content 40×40, passthrough)` →
  padding 15 → `ReusableCard(#1D1E33, onPress → GoToSpecificSensorScreenEvent(device, sensor))` →
  Column:
  1. Padding v5 → name (17, white, centred)
  2. Expanded padding 10 → image (`cartell_ct6.png` when onboard, else `Sensor.png`, contain)
  3. When onboard: padding v5 → 'Onboard Sensor'
- Tiles are square because they sit in a GridView.

## 2. Sensors list (`SensorsScreen(device)`, state `IsOnSensorsScreenState`)

- Keeps a local `device` copy.
- `AppScaffold`:
  - FAB: amber, FA plus black → `GoToAddSensorStart(device)`
  - actions: `[SensorEllipsis]`, a kebab with `ListTile(FA circlePlus, 'Pair Sensor')` → pop menu
    → `GoToAddSensorStart`
- `PopScope`: Back → `GoToSpecificDeviceEvent(widget.device)`.
- `Expanded → SafeArea → TimedPullToRefresh(refreshSensors: setDevice → setState; errors are
  debug-printed) → AlwaysScrollable scroll → Column(centre)`:
  1. Back arrow (padding left 10) → `GoToSpecificDeviceEvent`
  2. 'Sensors' (Source Sans Pro, letter-spacing 2, bold, 24, centred, padding h15)
  3. 5
  4. 'View existing Sensors or add a Sensor' (Source Sans Pro 16, height 1.25, maxLines 3,
     ellipsis, padding `fromLTRB(15,0,15,35)`)
  5. Content:
     - **0 sensors**: max width 300 → padding 15 → `ReusableCard(#1D1E33)` with padding 25:
       'No Sensors have been added.' (17, centred), `Icons.sensors` (100), 'Press the plus button
       below to get started.'
     - **1 sensor**: centred, max width 300, a one-column `GridView` (shrink-wrapped)
     - **2 or more**: a two-column `GridView` with horizontal padding 100 when the screen width
       ≥ 800, else 0
  6. 35

## 3. Sensor detail (`SensorView(device, sensor, isOnboardSensor, refresh)`)

- `currentSensor` is the shared instance. `updatedAt = now`.
- Actions: kebab `PopupMenuButton`:

  | Item | Action |
  |---|---|
  | FA pencil 'Rename Sensor' | pop → `GoToEditSensorScreen` |
  | FA mapLocation 'Edit Coordinates' | pop → `GoToEditSensorLocationScreen` |
  | FA circleInfo 'About' | pop → `GoToSpecificSensorAboutScreen` |
  | FA circleXmark red + 'Delete Sensor' red | pop → popup "Delete Sensor?" / "Are you sure you want to delete this Sensor?", `showCancel`, okay "Delete" → `deleteSensor` → `Navigator.pop` (dialog) → `GoToSensorsScreenEvent` |

- `PopScope`: Back → `GoToSensorsScreenEvent(device)`.
- `Expanded → SafeArea → TimedPullToRefresh(refreshSensor: setSensor → updatedAt = now) →
  AlwaysScrollable scroll → padding h (width > 500 ? 10% : 0) → Column`:
  1. Back arrow (padding `fromLTRB(10,0,30,0)`) → `GoToSensorsScreenEvent`
  2. `SensorFlaggedBanner(currentSensor.isBlacklisted, onContactSupport: MainAppBloc
     GoToContactUsScreen)`:
     - padding h20 v10, a box (`#EE9999`, radius 10, red border) with padding 12, containing:
       - 'This sensor has been flagged for suspicious activity. Please contact support to
         re-activate this sensor' (black, centred, soft-wrap)
       - 8
       - RoundedButton 'Contact Support' (amber, black)
     - Hidden when the sensor is not blacklisted.
  3. Name (30, centred, padding bottom 5)
  4. Padding 15 → `SizedBox(h155)` image (`cartell_ct6.png` when onboard, else `Sensor.png`)
  5. When **not** onboard:
     - Padding v15 → battery icon: none while checking; else FA batteryEmpty (redAccent
       `#FF5252`) when low, FA batteryFull (greenAccent `#69F0AE`) when good
     - Text (centred): "Battery Status: Checking..." (`#A2AAAD`) / "Battery Status: Low" /
       "Battery Status: Good"
  6. `ThreeButtonRow` (`IconButtonRowEntry` × 3):
     - Coordinates set (`hasLatLong`): 'Find Sensor' (FA mapLocation) →
       `MapsLauncher.launchCoordinates(double.parse(lat), double.parse(long), name)`. A parse
       error shows popup "An error occurred." / "Could not find location. Please make sure you
       have set a location for this sensor. If the problem persists, please contact support."
       (okay pops).
     - Not set: 'Set Location' (FA mapLocation) → `GoToEditSensorLocationScreen`.
     - 'View History' (`Icons.router`) → `GoToSensorHistoryEvent`.
     - 'About' (FA circleInfo) → `GoToSpecificSensorAboutScreen`.
  7. Padding h20 → `Divider(white60, 1)`
  8. Notifications: padding h20 v10 → padding h20 v10 → Row(spaceBetween) [Flexible "Receive
     Sensor Notifications:" (16), 10, `SynchronizedAutoSwitch<Sensor>`(shouldSendNotification) →
     PATCH]. Success "Notifications turned on/off." Failure "Notifications failed to turn
     on/off."
  9. When onboard: padding h25 → RoundedButton 'Pair Sounder' (amber, FA link) →
     `pairToSounder` (not awaited) + **teast banner** `showSuccess("Sent pairing message
     successfully")`. The error branch "Did not send pairing message" is effectively unreachable.
  10. Padding h10 v20 → horizontal scroll Row[Row["Last Updated: ", `formatDateAndTime(updatedAt)`]]
- Dead code: `showAlertDialogUpdateNotifications` / `…Success` (it uses `Navigator.push`). Not
  ported.

## 4. About sensor (`SensorMeta(device, sensor)`)

- Actions: X → `GoToSpecificSensorScreenEvent`. Back does the same.
- `Expanded → SafeArea → scroll → Column(stretch, spaceBetween)`:
  1. Back arrow (padding `fromLTRB(10,0,50,0)`)
  2. Padding `fromLTRB(15,45,15,30)` → `SizedBox(h200)` with `Sensor.png` (contain). This is
     **always** `Sensor.png`, even for the onboard sensor.
  3. Name (30, centred, padding v50)
  4. `KeyValuePairDisplay("Paired to Hub: ", device.name, fontSize 20)`
  5. `KeyValuePairDisplay("Date Paired", formatDateAndTime(sensor.connectionDate!), fontSize 16)`

## 5. Rename sensor (`EditSensor(device, sensor)`)

- Actions: `[SizedBox(50)]`. `PopScope` Back → `GoToSpecificSensorScreenEvent`.
- `Expanded → SafeArea → scroll → Column`:
  1. Back arrow (padding left 10)
  2. Row[padding `fromLTRB(15,35,15,20)` FA satelliteDish, Expanded 'Rename Sensor' (20, amber,
     bold)]
  3. Column(stretch):
     - 'Enter Your Sensor Name.' (20, bold)
     - 25
     - TextField (label 'Sensor Name', pre-filled, rebuilds on change)
     - 25
     - Padding `fromLTRB(0,15,0,5)` RoundedButton 'Submit' (blue, FA circleCheck) → `await PATCH
       {name}` → `sensor.name = name` (local) → `GoToSpecificSensorScreenEvent`. An error throws
       with no UI.

## 6. Edit coordinates (`EditCoordinates(device, sensor)`)

- The fields are seeded once from the sensor when it has coordinates.
- Actions: `[SizedBox(35)]`. `PopScope` Back → `GoToSpecificSensorScreenEvent`.
- `Expanded → SafeArea → LayoutBuilder → scroll → padding 5 → Column`:
  1. Back arrow (padding `fromLTRB(10,0,30,0)`)
  2. Padding `fromLTRB(15,0,15,20)` FA satelliteDish (50)
  3. 'Sensor Coordinates' (18, amber, bold)
  4. Padding h(15%/15) Column(stretch):
     - 'Set Your Sensor Coordinates.' (16 bold)
     - 15, then 'Enter Coordinates in DMS format.' (14)
     - 25, then the Latitude field (label 'Latitude', default keyboard)
     - 25, then the Longitude field
     - 25, then RoundedButton 'Detect Location' (blue, FA mapPin)
     - RoundedButton 'Submit' (amber, FA circleCheck)
- **Detect Location** (geolocator), with popup title "Can't Get Location" for each failure:
  1. Location services off → "Location services are turned off on this device. Turn them on in
     Settings, or type the coordinates in by hand."
  2. Permission denied → request → still denied → "Cartell needs location access to place this
     sensor. Allow it when prompted, or type the coordinates in by hand."
  3. Denied forever → "Location access is turned off for Cartell. Turn it on in Settings >
     Cartell > Location, or type the coordinates in by hand."
  4. `getCurrentPosition(accuracy: high)` throws → "Could not get a location fix. Move somewhere
     with a clearer view of the sky and try again, or type the coordinates in by hand."
  5. Success → fill both fields with full-precision `toString()` (if still mounted).
- **Submit**: both fields must parse as doubles, else popup "Coordinates Needed" / "Enter a
  latitude and longitude, or tap Detect Location to use where you are now.". Then `PATCH
  {latitude: formatCoordinate(lat), longitude: formatCoordinate(long)}` →
  `GoToSpecificSensorScreenEvent`.
  - `formatCoordinate`: no "." → unchanged; otherwise truncate the fraction to 6 digits; a
    trailing "." stays "x.".

## 7. Add-sensor wizard

`AddSensorData(oldSensors, intendedSensorName)`.

### Step 00 — `AddSensor(device)` (state `IsAddingASensorName`, not poppable)

- `initState`: `setDevice(id)`, then copy its sensors into `oldSensorList`. This is async, so
  tapping Continue first sends an **empty** list (race; spec 19).
- Actions: `[SizedBox(40)]`. `PopScope` Back → `GoToSensorsScreenEvent`.
- Column(centre):
  1. Back arrow → `GoToSensorsScreenEvent`
  2. 100
  3. 'Add a sensor' (25, centred)
  4. 35
  5. Padding h20:
     - padding v35 → FA houseSignal (125, amber)
     - TextField (name keyboard, centred, `maxLength 32` with the "n/32" counter, hint "Name of
       sensor")
     - RoundedButton 'Continue' (blue, black title, FA circleCheck black) →
       `GoToIsRemovingCaseForAddSensor(data(oldSensorList, name))`. **No name validation.**
     - 25

### Step 01 — `RemoveCaseForAddSensor(device, data)`

- Actions: X → `GoToSensorsScreenEvent`. Back does the same.
- Column:
  1. Back arrow
  2. 100
  3. 'Prepare to add' (30, centred)
  4. Padding h(15%/15):
     - padding v35 h25 → FA magnifyingGlass (125, amber)
     - "Remove the top of the sensor's case. \n\nFind the red button. (Don't press it yet.)" (18,
       centred)
     - 25
     - RoundedButton 'I see the red button!' (blue, black, FA check) → `GoToSensorConnectScreen`
     - 25

### Step 02 — `SensorConnectScreen(device, data)`

- `initCount = data.oldSensors.length`.
- `startRun`:
  1. Show the searching view and reset the counter to 60.
  2. `isDeviceConnectedRequest` false → fail with "Hub is not connected. Reconnect it, wait 15
     seconds, and then try again."
  3. `setPairingModeRequest(true)` (the wrapper does **not** await it).
  4. `ImmediateTimer` every 1 s runs `checkForNewSensor`:
     - `auth()` fails → skip this tick
     - not connected → fail with the same text
     - counter > 0 → decrement it; else fail with the generic message
     - `GET /devices/{id}/sensors`; if `count > initCount`, find the sensor **not in the old list
       by identity** (in practice by id, since the cache keeps instances), stop with success, then
       `PATCH {name: intendedSensorName}` (a null name throws)
- `stop()`: reset the counter, set the views, cancel the timer, `setPairingModeRequest(false)`
  (not awaited).
- UI: `AppScaffold` (no actions), `PopScope` Back → `GoToSensorsScreenEvent` (it does not stop
  pairing mode). `Center → scroll → SafeArea → padding h25 → Column`:
  - **Searching**:
    - 'Press and release the red button for 1 second' (22, white, bold)
    - 100
    - `SpinKitPulse(110, white)`
    - 30
    - 'Searching for sensor... <n>' (20, white)
    - 15
    - Padding h20 RoundedButton 'Cancel' (blue, black) → cancel the timer, `await` pairing off,
      `GoToSensorsScreenEvent`
  - **Success**:
    - 'The sensor has successfully connected to the Hub.' (20, centred)
    - 45
    - FA circleCheck (70, green `#4CAF50`)
    - 20
    - 'Continue' (blue) → `GoToSensorsScreenEvent`
  - **Failure**:
    - `errorMessage ?? 'The sensor was unable to connect to the Hub. Please try again. If the
      problem persists, please contact support.'` (20, centred)
    - 45
    - FA circleXmark (70, red `#F44336`)
    - 20
    - 'Return' (blue) → cancel the timer, `GoToSensorsScreenEvent`
