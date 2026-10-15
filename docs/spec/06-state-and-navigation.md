# 06 — State Machines and Navigation

Plan steps: 6.1–6.6, 7.x, 9.1, 9.2. Sources: `bloc/**`, `screens/bloc_widgets/*`,
`utilities/bloc_popups.dart`, `utilities/object_stack.dart`.

**The app does not use Navigator routes for screens.** Every screen is a function of a bloc
state, and moving between screens means emitting a new state. The only Navigator pushes are the
QR scanner, the standalone FailureWidget, dialogs, popup menus, bottom sheets and the drawer. The
RN port must reproduce this model, including its custom back-stack. A conventional
react-navigation stack would change Back behaviour and animations.

## 1. GenericBloc (`bloc/shared/bloc.dart`)

- Built on flutter_bloc 8. `setHandler<E>()` registers `on<E>` with the **default concurrent
  transformer**: events of different types, and repeated events of the same type, run
  concurrently. Handlers are async.
- Each handler is wrapped in `try/catch` (all errors), which calls
  `onErrorDuringEventHandle(e)`. Debug builds log `Handling event: …` and `Handled <Type> in Nms`.
- `emit` de-duplication: bloc skips an emit equal (Equatable `props`) to the current state, unless
  it is the first emit. States add timestamps or a `RefreshState` where they need to re-emit.
- `onTransition`: logs `Next State: …`.
  - A state with `isPoppable == false` is **not pushed** on the stack.
  - If the new state's runtime type equals the top's, the top is replaced (pop, then push).
  - Otherwise it is pushed.
- `popState(n)`: if the stack size is 1, return `fallbackState`. If n ≤ 0, throw. Otherwise pop
  **n + 1** times and return the last popped state. That state is then re-emitted and re-pushed.
- `emit.isDone` becomes true once the handler has completed or the bloc has closed. Late emits
  are dropped in release builds; in debug they throw an assertion. See the AddDeviceBloc quirk.

## 2. emitThenRefresh and RefreshState (`bloc/shared/bloc.dart`, `states.dart`)

1. `pending = build(checking)`; emit it.
2. `await revalidate()`.
3. If not done **and** `currentState() == pending`, emit `build(ready)`.
4. `AuthExpiredException` is rethrown, which reaches the bloc error hook and re-authenticates.
5. Any other error: if still current, emit `build(failed)`. The user stays on the screen.

`RefreshState`: `checking` (cached data shown, probe in flight), `ready`, `failed`.

## 3. AuthBloc (root)

Start state `IsLoadingAppState`, fallback `IsOnWelcomeScreenState`. The constructor adds
`AutoLoginEvent`. It owns `popupStreamController` (a stream of `RenderedMessage`) and
`subBloc: MainAppBloc`. It does not override the error hook, so errors are only logged.

| State | Poppable | Props |
|---|---|---|
| IsLoadingAppState | no | |
| IsOnWelcomeScreenState | yes | |
| IsLockedState(message?) | no | message |
| IsOnLoginScreenState(temporaryEmail?, emailError=false, passwordError=false, isSubmitting=false) | `!isSubmitting` | all |
| IsOnRegistrationScreenState(email?, firstName?, lastName?, phoneNumber?, isSubmitting=false) | `!isSubmitting` | all |
| IsOnDevicesScreenState(email?, password?, bloc, devices) | yes | email, password, devices (not bloc) |
| IsShowingPopUpMessage(title, message) | yes | (never emitted) |
| IsInMaintenanceMode(isUnreachable=false) | yes | isUnreachable |

Events: `AutoLoginEvent`, `GoToLoginScreenEvent(emailError, passwordError)`,
`GoToRegistrationScreenEvent`, `GoToWelcomeScreenEvent`, `AttemptLoggingInEvent(email,
password)`, `AttemptRegistrationEvent(…)`, `AttemptLogOutEvent(shouldLogOut=false)`,
`MaintenanceModeEvent(isUnreachable)`. Their flows are in spec 08.

## 4. MainAppBloc

Created on a successful login or auto-login (`MainAppBloc(parentBloc: authBloc)`). Start state
`IsLoadingMainAppState`, fallback `IsOnHubsScreenState`. The constructor adds
`GoToHubsScreenEvent`. `showMessage` forwards to the parent stream.

`onErrorDuringEventHandle`: `auth(force)`; if that fails, `parentBloc.add(AutoLoginEvent())`.
In both cases it then adds `GoToHubsScreenEvent()`.

Every state carries `timestamp = DateTime.now()` in its props, so **every emit is distinct**.

| State | Poppable | Content |
|---|---|---|
| IsLoadingMainAppState | no | |
| IsOnHubsScreenState | yes | |
| IsOnAccountSettingsScreenState(user?, profile?) | yes | null → skeleton |
| IsOnEventHistoryScreenState(event, refresh=ready) | yes | |
| IsOnContactUsScreenState | yes | |
| IsOnAlexaHelpScreenState(isConnected) | yes | |
| IsOnAccountSettingsEditNameScreenState(user) | no | |
| IsOnAccountSettingsEditPasswordScreenState(user) | no | |
| IsOnAccountSettingsEditPhoneNumberScreenState(user) | no | |
| IsOnHubLightsHelpScreenState | yes | |

| Event | Behaviour |
|---|---|
| GoToHubsScreenEvent | If the state is already Hubs **and** a live (not closed) DevicesBloc exists → `devices.add(GoToDevicesHomeScreen())`. Otherwise emit Hubs. |
| GoToAccountSettingsScreen | Emit skeleton → `await (setUser(), setProfile())` in parallel → if still current, emit with data |
| GoToEventHistoryScreen | Emit `(Event(), checking)` → `setEventData()` → if still current, emit `(event)` |
| GoToContactUsScreen | Emit Help |
| GoToAlexaHelpScreenState | Emit loading → `setProfile()` → emit `(isConnected: profile.alexaEnabled)` |
| GoToAccountSettingsEditName/Password/PhoneNumberScreenEvent(user) | Emit, with no refetch |
| GoToHubLightsHelpScreenEvent | Emit |
| GoBackNStatesEvent(n) | `emit(popState(n))` |

## 5. DevicesBloc

Created every time `IsOnHubsScreenState` is rendered:
`DevicesBloc(parentBloc: mainAppBloc, devices: <list from login>)`. Start state
`IsLoadingDevicesScreenState`, fallback `IsOnDevicesHomeScreenState(devices)`. The constructor
adds `GoToDevicesHomeScreen`.

`onErrorDuringEventHandle`:

1. `auth(force)` fails → if the auth bloc is not closed, `AutoLoginEvent`. Stop.
2. If closed, stop.
3. `recoveryAttempts++`. Above 3, log "Giving up after 3 recovery attempts; leaving the screen
   as-is." and stop.
4. Wait `recoveryAttempts` seconds, then (if not closed) `add(GoToDevicesHomeScreen())`.

`recoveryAttempts` resets on a successful home fetch.

| State | Poppable | Notes |
|---|---|---|
| IsLoadingDevicesScreenState | no | timestamp |
| IsOnDevicesHomeScreenState(devices) | yes | timestamp |
| IsAddingAHubState | yes | |
| IsShowingADeviceState(device, refresh) | **no** | |
| IsConnectingHubState(device) | yes | pairing host (spec 16) |
| IsOnSpecificDeviceHistoryScreenState(event, device, refresh) | yes | |
| IsOnSensorsScreenState(device, refresh) | yes | |
| IsOnSpecificSensorScreenState(device, sensor, refresh) | yes | |
| IsEditingSensorCoordinatesState(device, sensor) | no | |
| IsOnSpecificSensorHistoryScreenState(device, sensor, event, refresh) | yes | |
| IsOnSensorAboutScreenState(device, sensor, refresh) | yes | |
| IsOnAddHubSuccessScreen(device) | no | |
| IsOnEditDeviceScreen(device) | no | |
| IsOnDeviceFirmwareUpdatesScreen(device, espUpdate?, rfmUpdate?, currentRunning?) | yes | |
| IsOnAboutDeviceScreenState(device, refresh) | yes | |
| IsOnEditSensorScreenState(device, sensor) | no | |
| IsUpdatingDeviceFirmwareState(device, firmware, resumeUpdateId?) | yes | |
| IsAddingASensorName(device) | no | |
| IsRemovingCaseForAddSensor(device, data) | no | |
| IsOnSensorConnectScreen(device, data) | no | |
| IsOnDeviceSettingsScreen(device, refresh) | no | |

| Event | Behaviour |
|---|---|
| GoToDevicesHomeScreen | Cached list empty → loading, else home with the cached list; `fetchDevices()`; store it; reset recovery; if still current, emit home with the new list |
| RefreshDevices | `fetchDevices()` → store → emit home (no loading) |
| GoToAddAHubScreen | IsAddingAHubState |
| GoBackNDevicesStatesEvent(n=1) | `popState(n)` |
| GoToSpecificDeviceEvent(device) | `emitThenRefresh(IsShowingADeviceState, setDevice)` |
| GoToConnectHubBloc(device) | Loading → `setDevice` → IsConnectingHubState(refreshed device) |
| GoToSpecificDeviceHistoryEvent | `(Event(), checking)` → `setDeviceEvents` → if current, emit |
| GoToSensorsScreenEvent | `emitThenRefresh(IsOnSensorsScreenState, setDevice)` |
| GoToSpecificSensorScreenEvent | `emitThenRefresh(…, setSensor)` |
| GoToEditSensorLocationScreen | Emit (no revalidate) |
| GoToSensorHistoryEvent | `(Event(), checking)` → parallel `setSensor` and `setSensorEventData` → if current, emit with the refreshed sensor |
| GoToSpecificSensorAboutScreen | `emitThenRefresh(…, setDevice and setSensor in parallel)` |
| GoToAddHubSuccessScreen | Emit |
| GoToEditDeviceScreen | Emit (no revalidate) |
| GoToDeviceFirmwareUpdatesEvent(deviceId) | Loading → parallel setDevice, latest ESP, latest RFM, check running → emit (spec 14) |
| GoToAboutDeviceScreen | `emitThenRefresh(…, setDevice)` |
| GoToEditSensorScreen | Emit |
| GoToUpdateDeviceFirmwareScreen(device, firmware, resumeUpdateId?) | Emit |
| GoToDeviceSettingsEvent | `emitThenRefresh(…, setDevice)` |
| GoToAddSensorStart | IsAddingASensorName |
| GoToIsRemovingCaseForAddSensor(data) | Emit |
| GoToSensorConnectScreen(data) | Emit |

Note: `setDevice` always calls `queryHubHealth` first (spec 04).

## 6. Router widgets (`screens/bloc_widgets/*`)

- **AuthBlocWidget** (MaterialApp home):
  - Creates the AuthBloc and registers `updateMode` with ModeWatcherHelper (spec 08 §7).
  - Subscribes to the message stream → `drawMessage`.
  - Builds `ModeWatcher(AnimatedSwitcher(300 ms, reverse 300 ms, child: page))`.
  - State → screen: Loading → `LoadScreen`; Welcome → `WelcomeScreen`; Locked →
    `LockScreen(message)`; Login → `LoginScreen(…4 fields)`; Registration →
    `RegistrationScreen(…5 fields)`; DevicesScreen state → `MainAppBlocWidget(authBloc, bloc,
    devices)`; Maintenance → `MaintenanceModeScreen(isUnreachable)`; unknown → throws.
  - **No PopScope**, so Android Back at this level closes the app (moves the activity to the
    background).
- **MainAppBlocWidget**: `PopScope(canPop:false)` + AnimatedSwitcher 300 ms. Hubs → creates a
  **new DevicesBloc** → `DevicesBlocWidget`. Account settings → skeleton or `AccountSettings`.
  The other states map one-to-one: History, ContactUs, EditName, EditPassword, EditPhone,
  HubLightsHelpScreen, AlexaCheatSheet, LoadScreen.
- **DevicesBlocWidget**: `PopScope(canPop:false)` + AnimatedSwitcher 300 ms (the default fade).
  The state → screen mapping is in the table in §5 and spec 10–16. It has a local `drawMessage`
  that handles only PopupError, falling back to "Whoops".
- **AnimatedSwitcher**: the default `FadeTransition`. Old and new children are layered in a Stack
  and cross-fade over 300 ms. Same-type children update in place without re-mounting. That is
  why the History screens implement `didUpdateWidget`. Replicate the update-in-place rule: the RN
  component must keep its local state when only props change within the same screen type.

### drawMessage (`utilities/bloc_popups.dart`)

| Message | Rendering |
|---|---|
| PopupError(title, message) | `showPopupMessage(title, message)` |
| PopupNotification(title, message, icon) | the same, with the icon |
| PopupDialog(title, message, onOkay) | `showPopupMessage(…, onOkay: () { onOkay(); Navigator.pop(); }, showCancel: true)` |
| other | `showPopupMessage("Whoops", "I'm not sure what this is. Sorry!")` |

## 7. Android Back map

Back at the MainApp and Devices levels is blocked by the outer `PopScope(canPop:false)`. Each
screen's own `PopScope.onPopInvokedWithResult` still fires (with `didPop=false`) and dispatches
its event. Screens without one do nothing on Back.

| Screen | Back does |
|---|---|
| Load, Welcome, Login, Registration, Lock, Maintenance | Exits the app (no PopScope) |
| Hubs (DevicesScreen) | Popup "Leave App" / "Are you sure you want to leave this app?" with "Nevermind" (cancel) and "Leave" → `SystemNavigator.pop` (Android: to the background, the popup left open, Q51). Also with the drawer open, which stays open (Q52) |
| Account Settings | `GoToHubsScreenEvent` (canPop is true, but outer scopes block it) |
| Edit name / phone | `GoToAccountSettingsScreen` |
| Edit password | `GoToAccountSettingsScreen`, ignored while submitting |
| Help (ContactUs) | `GoToHubsScreenEvent` (its X button does `GoBackNStates(1)` instead) |
| Alexa cheat sheet, Hub light guide | **nothing** (no PopScope) |
| All event history | `GoToHubsScreenEvent` |
| Hub detail | `GoToDevicesHomeScreen` |
| Hub settings, About hub, Rename hub, Hub history, Sensors list | `GoToSpecificDeviceEvent(device)` |
| Firmware updates | `GoToSpecificDeviceEvent(device)` |
| Update progress | `_leave()` (feedback prompt after success, then the firmware screen) |
| Sensor detail | `GoToSensorsScreenEvent` |
| About sensor, Rename sensor, Edit coordinates, Sensor history | `GoToSpecificSensorScreenEvent` |
| Add sensor steps 00, 01, 02 | `GoToSensorsScreenEvent` (step 02 does **not** cancel the timer or disable pairing mode on Back; the screen unmounts and its timer is cancelled in dispose) |
| Add hub | `GoToDevicesHomeScreen` |
| Hub added (success) | `GoToSpecificDeviceEvent` |
| Pairing (HubConnectWidget) | `requestPairingExit` (spec 16 §6) |
| Loading screens inside MainApp or Devices | nothing |
| Dialogs and popups | `barrierDismissible:false`, but **system Back still dismisses** Flutter dialogs. Verify against the Phase 1 reference. |
| Cupertino sheets (debug menu, feedback) | Back dismisses the sheet |
| QR scanner (pushed route) | Pops the route |

iOS: no screen is a pushed route, so there is **no edge-swipe back** on bloc screens. The QR
scanner is a MaterialPageRoute and does support the iOS swipe-back gesture.

## 8. Port strategy

Implement a small TS `Bloc` base class (concurrent async handlers, an emitter with `isDone`,
equality-based de-duplication, the stack logic above), the three bloc classes with identical
event and state classes, and React hosts using `useSyncExternalStore`. Render the active screen
inside a cross-fade container that keeps both children during the 300 ms fade and preserves
component identity for same-type states. Map Android Back with `BackHandler` according to §7.
