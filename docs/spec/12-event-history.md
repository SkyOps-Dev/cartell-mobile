# 12 — Event History

Plan steps: 11.1, 11.2. Sources: `screens/events/history.dart`, `device_history.dart`,
`sensor_history.dart`, `phone_rotation_manager.dart`, `services/requests/event_requests.dart`.

## 1. HistoryCard (shared by all three screens)

- Fields, in a Column(start):
  1. `'${sensorName ?? deviceName}'` (17, clip, maxLines 2)
  2. 5, then `eventType.label` (17, **always `Colors.red` `#F44336`**, whatever the type)
  3. 5, then the date (17)
  4. 5, then `sensorName != null ? "Connected to ${deviceName}" : ""` (`#A2AAAD`, w500, 12)
- Icon: `eventType.icon` (45, amber). See the EventType table in spec 05.
- Date conversion: `DateTime.parse(time).toLocal()`, then:
  - hour > 12 → `"MM-dd-yyyy " + (hour-12) unpadded + ":mm:ss PM"`
  - hour == 12 → `"MM-dd-yyyy 12:mm:ss PM"`
  - hour == 0 → `"MM-dd-yyyy 12:mm:ss AM"`
  - otherwise `"MM-dd-yyyy " + hour **zero-padded** + ":mm:ss AM"`. The hour is unpadded in the
    afternoon and padded in the morning, for example "09:05:03 AM" but "1:05:03 PM".
- Layout, when `getScalingFactor(15) < 1.75`: padding h35 v20, Row(centre; mainAxis centre when
  width > 500, else start) [icon, 35, Flexible Column(fields), and when width > 500 a
  `SizedBox(80)` to keep it centred].
- Else: padding h35 v20, Column(start) [padding 8 → centred icon, ...fields].

## 2. All Event History (`History`, MainApp state `IsOnEventHistoryScreenState`)

- `PhoneRotationManager().allowAll()` on init and dispose (all four orientations; this is already
  the default).
- Seeded from `widget.event`. `didUpdateWidget` re-seeds when the event object changes, because
  the cross-fade updates in place.
- `isLoading` is only true before the first seed: `AppScaffold(actions: [SizedBox(48)])` plus a
  centred spinner.
- Main: `AppScaffold(actions: [SizedBox(48)])`, `PopScope(canPop: false)` Back →
  `GoToHubsScreenEvent`. `Expanded → SafeArea → Column(start, stretch)`:
  1. 20
  2. Padding `fromLTRB(10,0,50,0)` back arrow → `GoToHubsScreenEvent`
  3. 'All Event History' (24, bold, height 1.25, centred)
  4. Padding top 8 → `Divider(height 20, white, thickness 1)`
  5. If `refresh == checking` → an expanded centred spinner. Else an expanded
     `TimedPullToRefresh(updateHistory)` → `ListView.builder`:
     - `itemCount = results + (loadMore ? 1 : 0)`
     - The last item is padding v25 → a 60×60 `FittedBox` spinner (blue)
     - A scroll listener: when `pixels == maxScrollExtent` and `loadMore` →
       `setEventData(nextURL)` and append
- `updateHistory`: `fetchDevices()` (fire and forget, an extra request), then clear, set
  `isLoading` true (the whole screen shows the loading scaffold), then `setEventData()`. Errors →
  Sentry, `isLoading` false.

## 3. Hub history (`DeviceHistory`, Devices state `IsOnSpecificDeviceHistoryScreenState`)

- Rotation `allowAll`. Seeded from the widget, with `didUpdateWidget` re-seeding.
- `AppScaffold` actions: X → `GoToSpecificDeviceEvent(device)`. Body → `Expanded → SafeArea →
  _buildContent`:
  - `isLoading` → a spinner
  - `errorMessage` → padding 50, `Icons.warning_amber_rounded` (175, deepOrange), 15, then the
    **raw exception text**
  - Otherwise `PopScope` (Back → `GoToSpecificDeviceEvent`) → Column(stretch):
    1. Padding `fromLTRB(10,0,30,0)` back arrow
    2. Device name (20, bold, height 1.0, centred)
    3. Padding v3 → "Hub's Event History" (14, height 1.25, centred)
    4. 5
    5. Divider (as in §2)
    6. The list (as in §2, using `setDeviceEvents`). The refresh clears, shows the spinner, then
       fetches. Errors show the error view.

## 4. Sensor history (`SensorHistory`, Devices state `IsOnSpecificSensorHistoryScreenState`)

- Rotation `allowAll`. Seed and `didUpdateWidget` as above.
- Actions: X → `GoToSpecificSensorScreenEvent(device, sensor)`. `PopScope` Back does the same.
- Column(stretch):
  1. Back arrow (padding `fromLTRB(10,0,30,0)`)
  2. Sensor name (18, bold, centred)
  3. Padding v3 → "Sensor's Event History" (12, centred)
  4. Divider
  5. The list (`setSensorEventData`). The refresh clears and re-fetches **without** a loading
     state. Errors only go to Sentry.

## 5. Paging

The `next` URL from the server is used verbatim except for the scheme rewrite (spec 04 §5).
`loadMore` is false once `next` is null or empty.
