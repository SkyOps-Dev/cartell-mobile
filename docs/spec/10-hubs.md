# 10 — Main Shell (NavBar) and Hubs

Plan steps: 9.1–9.6. Sources: `components/navbar.dart`, `components/app_scaffold.dart`,
`components/ellipsis.dart`, `screens/devices/devices_screen.dart`, `device_view.dart`,
`device_settings_screen.dart`, `device_meta.dart`, `edit_device.dart`,
`components/hub_status_glyph.dart`, `bloc/main_app/**`, `bloc/devices/**`.

## 1. NavBar (drawer ≤ 800 px, inline rail > 800 px)

- `initState` takes the **first** User in `DataPersistor<User>`. If the persistor is empty it
  throws `NoUserObjectFound("The user doesn't seem to be set in the userPersistor()")`. The
  persistor is never cleared, so after logging out and into another account in the same app
  session the menu still shows the first account (quirk Q50). The drawer is built each time it
  opens, so this runs on every open.
- If `email != ""`: `Drawer(backgroundColor #54585A) → ListView(padding 0) → Column`:
  - `UserAccountsDrawerHeader`:
    - decoration colour `#54585A`
    - `currentAccountPicture`: `ClipOval(avatar.png 90×90 cover)`
    - `accountName`: "<first> <last>" (14)
    - `accountEmail`: email (14), **omitted when `bigFont(18)`** (scale > 1.4)
  - ListTiles (leading FA icon at size 30, title text 14). Dividers between them have thickness
    1 and indents 10/10.

    | Order | Icon | Title | Action |
    |---|---|---|---|
    | 1 | FA user | 'Account Settings' | `GoToAccountSettingsScreen` |
    | 2 | FA clockRotateLeft | 'Event History' | `GoToEventHistoryScreen` |
    | 3 | FA satelliteDish | 'HUBs' | `GoToHubsScreenEvent` |
    | 4 | FA headset | 'Help' | `GoToContactUsScreen` |
    | 5 | FA arrowRightFromBracket | 'Log Out' | `AuthBloc.add(AttemptLogOutEvent())` |

  - Every tap first calls `Scaffold.maybeOf(context)?.closeDrawer()` (a no-op for the rail),
    then dispatches.
- Else: centred Text 'Unable to get current user. Please restart the app and try again.'
- Rail mode (> 800): the same Drawer widget placed inline at the left of the body Row, with no
  scrim and no hamburger.
- Open the drawer via the hamburger (AppBar leading, added automatically: Icons.menu,
  onSurface #E6E0E9, tooltip "Open navigation menu") or a drag from the left edge (20 dp + left
  inset). Close via a scrim tap, a drag, or an entry. **Back does not close it** (corrected
  2026-10-15, from `routes.dart` and measured on the phone): every MainApp screen sits under
  `PopScope(canPop: false)`, and `ModalRoute.popDisposition` answers doNotPop before the drawer's
  LocalHistoryEntry is consulted, so Back runs the screen's own handler with the drawer left open
  (on Hubs: "Leave App" over the open drawer; quirk Q52).
- Drawer values (`drawer.dart`, `_DrawerDefaultsM3`; measured on the RMX5070, 2026-10-15): width
  304, end corners 16, no shadow; scrim black54 × value; motion `AnimationController.fling`
  (critically damped spring, stiffness 500, ±1/s, done at the end: about 300 ms from rest);
  a drag faster than 365 dp/s flings, slower settles at the halfway mark.
- Header (`UserAccountsDrawerHeader` over `DrawerHeader`): statusBar + 161 tall including a 1 dp
  `#49454F` bottom line, then 8 margin; avatar 72 × 72 at (16, statusBar + 16); details box 56 at
  the bottom, the email centred 28 above its bottom and the name directly above. Name bodyLarge,
  email bodyMedium, both onSurface. Tiles: 56 tall, icon at x 16 in onSurfaceVariant `#CAC4D0`,
  title at x 62 in onSurface. Dividers 16 tall, line `#49454F` at the middle.

## 2. Hubs list (`DevicesScreen`, state `IsOnDevicesHomeScreenState`)

- `initState` → `fullLogin()` (notification permission plus FCM send) **each time it mounts**.
- `PopScope(canPop: false)`: Back → popup 'Leave App' / 'Are you sure you want to leave this
  app?', cancel 'Nevermind', okay 'Leave' → `SystemNavigator.pop`. **On Android it sends the app
  to the background; the activity stays alive** (measured 2026-10-15: same ActivityRecord after
  Leave; FlutterFragmentActivity hands it to the OnBackPressedDispatcher's default, as React
  Native's `BackHandler.exitApp()` does). Leave does not close the popup, so it is still open
  when the app comes back (quirk Q51). A no-op on iOS.
- `AppScaffold`:
  - FAB: amber, FA plus black → `GoToAddAHubScreen`
  - actions: `[Ellipsis]`, a kebab with one item `ListTile(FA circlePlus, 'Add Hub')` → pop menu,
    then `GoToAddAHubScreen`. The menu (PopupMenuPosition.over; measured 2026-10-15): 168 × 72 at
    (184, statusBar + 8), `#211F26`, radius 4, elevation 3, no barrier colour; 300 ms open,
    reverse through Interval(0, 2/3).
- Body: `ListenableBuilder(DataPersistor<Device>)` → `Expanded` → `SafeArea` →
  `TimedPullToRefresh(onRefresh: add RefreshDevices)` → scroll → `Column(stretch)`:
  - Padding v15, then a centred title block: 'Hubs' (Source Sans Pro, letter-spacing 2, bold,
    32, centred), 5, 'View existing HUBs or add a HUB' (Source Sans Pro, 20, centred).
  - **Empty list**:
    - 35
    - A container (max width 300 if `scale(15) < 1.25`) holding a `ReusableCard(#1D1E33)` with
      padding 25: 'No Hubs have been added.' (17, padding 5,5,5,10), FA satelliteDish 100, 'Press
      the plus button below to get started.' (padding 5,10,5,5)
  - **List**: `Center` → container (max width 300 if `scale(15) < 1.5`) → a one-column
    `GridView` (square tiles, shrink-wrapped). Each tile:
    - `badges.Badge(showBadge: device.hasBlacklistedSensor, padding 0, content 40×40,
      passthrough)` → padding 10 → `ReusableCard(#1D1E33, onPress → GoToSpecificDeviceEvent)`
      → `Column(center)`:
      - name (17, white, centred, in a horizontal scroll)
      - padding 10 → `HUB.png` (fitWidth, h150) **or**, when `device.device.isBlacklisted`,
        `Icons.warning_amber_rounded` (175, deepOrange)
      - 10
      - a horizontal-scroll Row(spaceAround, centre): FA towerBroadcast (amber when connected,
        `#54585A` when not), 15, then text 'Status: Blacklisted' when the hub is blacklisted,
        else 'Status: Connected' or 'Status: Disconnected' (ellipsis)
  - 35
- `RefreshDevices` re-fetches and re-emits with no loading flash.

## 3. Hub detail (`DeviceView`, state `IsShowingADeviceState(device, refresh)`)

- Local `device` and `updatedAt = now`.
- Actions: a kebab `PopupMenuButton`:

  | Item | Action |
  |---|---|
  | FA pencil 'Rename Hub' | pop menu → `GoToEditDeviceScreen` → `refreshDevice()` |
  | FA circleInfo 'About' | pop → `GoToAboutDeviceScreen` |
  | FA cloudArrowDown 'Check for updates' | pop → `GoToDeviceFirmwareUpdatesEvent(id)` |
  | FA circleXmark red + Text red 'Delete Hub' | opens the delete popup **while the menu is still open** |

  Delete popup: title "Delete Hub?", message "Are you sure you want to delete this Hub? Note: Any
  sensors paired to this hub will remain paired until manually deleted.", `showCancel`, okay
  "Delete". On okay: `DELETE /devices/{id}/` → pop the dialog → pop the menu →
  `GoToDevicesHomeScreen`. A delete failure throws in the callback, so the dialog stays and
  Sentry captures it.
- `PopScope`: Back → `GoToDevicesHomeScreen`.
- Body: `Expanded → SafeArea → LayoutBuilder → TimedPullToRefresh(refreshDevice: setDevice →
  updatedAt = now; errors are only logged) → AlwaysScrollable scroll → Column(stretch, center)`:
  1. Back arrow (padding left 10) → `GoToDevicesHomeScreen`
  2. Device name (30, centred, padding bottom 5)
  3. If `device.device.isBlacklisted`: padding h20 v10 → a box (`#EE9999`, radius 10, red
     border) with padding 12 → "This hub has been flagged for suspicious activity. Please
     contact support to re-activate this hub" (black, centred, soft-wrap). No button.
  4. `HubStatusGlyph(device, refresh)` (spec 07 §10)
  5. Padding h (0 when the inner width < 500, else 15% of the outer width), v20 → Column:
     - padding h8 → a two-column `GridView` (aspect 1.4, not scrollable) of centred
       `IconButtonRowEntry` items:

       | Label | Icon | Enabled when | Action |
       |---|---|---|---|
       | 'History' | FA clockRotateLeft | always | `GoToSpecificDeviceHistoryEvent` |
       | "Open Gate" | FA doorOpen | `widget.device.shouldUseEmulatedSensor && isConnected` | `triggerIntegrator(id)` (not awaited) + toast "Sent message to open gate" (`#54585A`, Cupertino `check_mark_circled_solid`) |
       | 'Sensors' | Icons.router | always | wrapped in `badges.Badge` (padding `fromLTRB(0,70,10,0)`, 10×10, shown when `hasBlacklistedSensor`) → `GoToSensorsScreenEvent` |
       | 'Firmware Updates' | FA microchip | always | `GoToDeviceFirmwareUpdatesEvent` |
       | 'Connect HUB' | FA rss | `!isConnected` | `GoToConnectHubBloc` |
       | "Hub Settings" | FA gear | always | `GoToDeviceSettingsEvent` |

     - Padding h20 → `Divider(white60, 1)`
     - Padding h10 v20 → "Last Updated: <MM-dd-yyyy hh:mm a>" (soft-wrap)

## 4. Hub settings (`DeviceSettingsScreen`, `IsOnDeviceSettingsScreen(device, refresh)`)

- Actions: X (FA xmark) → `GoToSpecificDeviceEvent(device)`. `PopScope` Back does the same.
- Body: `Expanded → SafeArea → Scrollbar(controller, thumbVisibility: true) → scroll →
  Column(stretch, spaceBetween)`:
  1. Back arrow → `GoToSpecificDeviceEvent`
  2. Name (30, centred, padding bottom 15)
  3. `HubStatusGlyph` (padding 10)
  4. `Divider(white60, 1)` with padding `fromLTRB(20, 15, 20, 0)`
  5. Five switch rows. Each row has padding h20 v2 and holds a Flexible label (16), 10, and a
     `SynchronizedAutoSwitch<Device>`. A `Divider(white60, 1)` with padding h20 v1 follows each
     row. Toast messages:

     | Label | Field | PATCH key | Success toast | Failure toast |
     |---|---|---|---|---|
     | 'Enable Onboard Sensor:' | shouldUseOnboardSensor | `should_use_onboard_sensor` (no auth()) | "Onboard sensor turned on/off." | if the hub is not connected (checked first): "Hub is not connected. Please connect hub and try again."; exception: "Error encountered of type: <Type>. Onboard sensor turned <opposite>. Please try again soon." |
     | 'Enable Integrator Support:' | shouldUseEmulatedSensor (the setter also calls `setState`) | `should_use_emulated_sensor` | "Integrator support turned on/off." | "Email notifications failed to turn on/off." (**copy bug**, keep it) |
     | 'Receive Hub Notifications:' | shouldSendNotification | `should_send_notification` | "Notifications turned on/off." | "Notifications failed to turn on/off." |
     | 'Receive Connection Notifications:' | shouldSendConnectionNotification | `should_send_connection_notification` | same | same |
     | 'Receive Email Notifications:' | shouldSendEmail | `should_send_email` | "Email notifications turned on/off." | "Email notifications failed to turn on/off." |

  6. Integrator row extra: when `widget.device.shouldUseEmulatedSensor`, 10, then
     `ElevatedButton("Pair Integrator", amber text)` (Material 3 default style) →
     `pairToIntegrator` (not awaited) + toast "Sent pairing message successfully" (the
     `on Exception` branch with "Did not send pairing message" is effectively unreachable).
- Note: the `Device` model does not merge `shouldUseEmulatedSensor` on refresh (spec 05), so its
  value comes from the instance first parsed in this session, or from the local toggle.

## 5. About hub (`DeviceMeta`, `IsOnAboutDeviceScreenState(device, refresh)`)

- Actions: X → `GoToSpecificDeviceEvent`. Back does the same.
- `Expanded → SafeArea → scroll → Column(stretch)`:
  1. Back arrow
  2. Name (30, centred, padding `fromLTRB(0, 35, 0, 15)`)
  3. `HubStatusGlyph` (padding 10)
  4. Divider (white60, padding h20)
  5. `KeyValuePairDisplay("Mac Address", mac)`, Divider
  6. `("Controller Firmware Version", esp32AppVersion.toString())`. A missing value shows
     **"null"**. Divider.
  7. `("Transmitter Firmware Version", rfm6601AppVersion.toString())`, Divider
  8. A nested horizontal scroll with "Last Updated: " + `formatDateAndTime(DateTime.now())`,
     **recomputed on every build**

## 6. Rename hub (`EditDevice`, `IsOnEditDeviceScreen(device)`)

- Actions: X → `GoToSpecificDeviceEvent`. Back does the same.
- `Expanded → SafeArea → scroll → Column(stretch)`:
  1. Back arrow
  2. Padding h20 → Row[padding v25 → Row[FA satelliteDish (padding `fromLTRB(15,10,15,20)`),
     'Hub Settings' (20, amber, bold)]]
  3. Padding h20:
     - 'Enter Your Hub Name.' (20, bold)
     - 25
     - TextField (`kTextFieldDecoration`, label 'Hub Name', pre-filled with the name)
     - 25
     - RoundedButton 'Submit' (blue, FA circleCheck, padding `fromLTRB(0,15,0,5)`) → `await
       PATCH {name}` → `GoToSpecificDeviceEvent`. An error throws with no UI.
