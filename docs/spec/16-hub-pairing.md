# 16 — Hub Pairing (Wi-Fi Provisioning)

Plan steps: 2.1, 2.2, 15.1–15.10. Sources: `screens/devices/connect_hub_to_wifi/**` (library
`connect_hub.dart`, 19 widgets), `components/pairing/pairing_step_scaffold.dart`,
`components/hub_light_widget.dart`, `udp_commands/**`, `services/encryption.dart`,
`services/requests/device_requests.dart` (`probeHubRegistration`),
`frontend/docs/superpowers/**` (design history and the hardware verification checklist),
`frontend/CLAUDE.md` and the root `CLAUDE.md` ("Measured hub behaviour").

This is the hardest part of the app. Port it **logic first** (pure functions plus their tests),
then the native Wi-Fi and UDP layer, then the screens.

## 1. Entry and host

- Reached through `GoToConnectHubBloc(device)`: loading → `setDevice` → `IsConnectingHubState`.
  It is triggered by hub detail "Connect HUB" (enabled only when disconnected) or by Hub added
  "Proceed and Pair To Wi-Fi".
- `HubConnectWidget(device, firstTime = false)`. `firstTime` is never true in practice.
  - `Provider<Device>`, then `BlocProvider(HubConnectionBloc(device))`.
  - A `Builder` watches the bloc state and renders `PopScope(canPop: pairingCanPop(state),
    onPop: popped ? GoToDevicesHomeScreen : requestPairingExit)`. Outer scopes block the pop, so
    the callback always runs.
  - `SafeArea → BlocBuilder` provides `Provider<PairingStep>.value(pairingStepIndex(state))` and
    `Provider<PairingExit>.value(() => requestPairingExit(context))`, then switches on the state
    (§7).
- There is **no animation between pairing steps**; the screens switch instantly. The 300 ms
  cross-fade only applies when entering or leaving the pairing host.

## 2. Constants

| Name | Value |
|---|---|
| Hub AP SSID | `'Cartell Hub ' + device.device.macAddress` |
| Hub AP password | `'family12'`, WPA |
| Join options | `joinOnce: true`, `withInternet: false` |
| Hub address / ports | `192.168.4.1` : `5002`, local bind `6452` (spec 02) |
| Join approval word | iOS 'Join', Android 'Connect' |
| `beginPairingWaitTime` | 15 s |
| Verification | 2 messages/s × 40 s = 80 messages |
| Credential send | every 4 s, timeout 16 s, so 4 sends |
| `kReconnectWindow` | 90 s |
| Reconnect backoff | 1 s (attempts 1–3), 2 s (4–6), 5 s (7 and later) |
| `kAccessPointProbeAfter` | 60 s, measured from the credential ack |
| `kAccessPointProbeTimeout` | 8 s |
| `kAccessPointProbeCleanupTimeout` | 10 s |
| Registration poll backoff | 2 s (checks 1–3), 5 s (4–6), 15 s (7–12), 60 s (13 and later), clamped so it never sleeps past the probe due time |
| Background poll interval | 5 s |
| Back-off after the probe | 15 s |
| Total numbered steps | 6 |

## 3. HubWifi (the Wi-Fi hop)

With `skipWifiHandoff` set, every call is a no-op and `isConnected` returns false.

| Call | Does |
|---|---|
| `joinHubNetwork(mac)` | `WiFiForIoTPlugin.connect(ssid, password, WPA, joinOnce, withInternet:false)`. The result is **ignored**. The OS shows its approval prompt on a fresh install. |
| `forceWifiUsage(bool)` | `WiFiForIoTPlugin.forceWifiUsage(use)` (binds the process to Wi-Fi); result ignored |
| `leaveHubNetwork()` | `WiFiForIoTPlugin.disconnect()` |
| `isConnected()` | `WiFiForIoTPlugin.isConnected()` |
| `isEnabled()` | Android only; Initial step warning |

## 4. HubConnectionBloc

### Fields

- `hubSocket` (UDPConnection?)
- `activePoller`
- `teardownInFlight`, `reconnectInFlight`, `abandonRequested`
- `startedAt`, `credentialAckAt`
- `timerManager` (named timers; `stopAll` cancels the active ones)
- `wifiNetworks` (map from SSID to reply, in insertion order)
- `scanGeneration`
- Handlers are registered for all 21 events (a test asserts this). Handlers are
  `void … async`, so bloc does not await them.

### `close()`

Cancel `activePoller`, set it to null, set `ModeWatcherHelper().isPairingDevices = false`. It does
**not** reset `currentState`.

### States → screens and step numbers

| State | Screen | Step | Back without confirming? |
|---|---|---|---|
| BeginPairingHubState | BeginPairingHubWidget | 1 | yes |
| CheckingHubIsPluggedInState | CheckIfHubIsPluggedInWidget | 2 | yes |
| CheckingLightOfHubState | VerifyingHubStateWidget | 3 | yes |
| ResettingHubWifiCredentialsState | ResettingHubWidget | — | yes |
| InitialHubConnectionState | InitialConnectionWidget | 4 | yes |
| ConnectingToHubState | ConnectingToHubWidget | 4 | **no** |
| VerifyingHubConnectionState | ValidatingConnectionWidget | 4 | **no** |
| ConnectedToHubState | ListWifiNetworksWidget | 5 | **no** |
| SelectedNetworkState(wifiNetwork) | ViewWifiNetworkWidget | 6 | **no** |
| HubConnectingToWifiState | StartHubConnectingToNetworkWidget | 6 | **no** |
| CheckingIfHubConnectedToWifiState(startedAt, reason, showLightReadings) | CheckingIfHubConnectedToServerWidget | 6 | **no** |
| HubConnectedToWifiSuccessfullyState | SuccessWidget("Hub has successfully connected to the network.") | — | yes |
| PairingStoppedState | PairingStoppedWidget | — | yes |
| HubRevertedToAccessPointState | HubRevertedWidget | — | yes |
| AnErrorOccurredState(message, code, detail?) | FailureWidget | — | yes |
| SessionExpiredState | FailureWidget('Your session has expired.\nPlease sign in again to finish setting up your hub.', code e5b1907d-A) | — | yes |
| ReestablishConnectionToServerState | ReestablishConnectionToServerWidget | — | **no** |
| WifiReconnectFailedState | WifiReconnectFailedWidget | — | yes |
| ReconnectToServerSuccessfullyState | SuccessWidget("Successfully reconnected to the server.") | — | yes |
| any other | throws `Exception("State <T> not recognized.")` | | |

## 5. Events (behaviour)

### Setup steps

Each just emits a state:

| Event | Emits |
|---|---|
| BeginPairingHub | Begin |
| CheckingHubIsPluggedIn | CheckingPluggedIn |
| VerifyThatHubIsPluggedIn | CheckingLight |
| VerifyThatHubIsReadyToPairToWifi | InitialHubConnection |
| HubIsNotInTheCorrectState | Resetting |
| HubHasBeenReset | CheckingLight |

### StartConnectionEvent

1. Emit ConnectingToHub.
2. `isPairingDevices = true`, `currentState = paused` (suppresses maintenance probes).
3. `joinHubNetwork`, wait 500 ms, `forceWifiUsage(true)`, wait 500 ms.
4. `UDPConnection.clearConnection()`, then `hubSocket = await getInstance()`, which binds after a
   built-in 1 s delay.
   - A bind error while still in ConnectingToHub → Sentry + `ErrorOccurredEvent('Could not open
     a connection to your hub.\nPlease try again.', '762c844a-S')`.
   - If the state changed meanwhile (the user cancelled) → return silently.
5. If the state is no longer ConnectingToHub → clear the socket, null it, return.
6. Otherwise `FinishedConnectingEvent`.

### FinishedConnectingEvent (observes UDP)

1. Emit Verifying. Wait 1 s. If the state is no longer Verifying, return.
2. Add the listener. Start an `ImmediateTimer` every 500 ms (registered as `getFwVersionTimer`),
   running `sendMessage`:
   - After more than 80 messages:
     - `describeVerificationTimeout(replies, stage, approvalLabel)`:
       - 0 replies → code `762c844a-0`, message 'Your phone never reached the HUB.', detail 'If
         your phone asked for permission to join a network, that prompt may still be waiting,
         or it may have been dismissed. Try again, and tap "<Join|Connect>" when you see it.'
       - otherwise → `762c844a-<stage 1..3>`, 'The connection to your hub could not be verified.
         \nPlease try again.'
     - Breadcrumb (`pairing`, 'verification timed out', `{stage, messagesSent,
       repliesReceived, socketExceptions}`, level error).
     - `ErrorOccurredEvent(code, message, detail)`, cancel the timer, remove the listener.
   - Stage 1 sends `GetFWVersion`. Stage 2 sends `ReadWebsocketUri`. Stage 3 sends
     `SaveWebsocketUri` then `ReadWebsocketUri`. **Stages 2 and 3 only run in debug builds**
     (`shouldCheckWsUrl = kDebugMode`).
   - `SocketException`:
     - more than 6 sent and every one failed → `ErrorOccurredEvent("We weren't able to connect
       to your hub. \nPlease try again later.", "9d5a3474")`
     - more than 12 exceptions → `("Connection is unreliable. \nPlease try again.",
       "8874c4b9")`
3. `receive(msg)`: count the reply → `interpretVerificationMessage` → breadcrumb `verification
   message <OutcomeType>` (`{stage, messageType}`; level error when the message is unknown):
   - Ignore (already verified, or a stage-3 mismatch)
   - `Succeed(writeWebsocketUri)`:
     - In release this means the stage-1 `GetFWVersionReply`. Send `SaveWebsocketUri` with the
       default URI `<baseUrlWs>/hub/` **now, then at 120 ms and 240 ms** (best effort; errors are
       logged and sent to Sentry).
     - Then `succeed()`: cancel the timer, `isVerified = true`, add `VerifiedConnectionEvent`.
   - `Advance(next stage)` (debug)
   - Unknown → `ErrorOccurredEvent('762c844a-W', "The connection to your hub could not be
     verified. \nPlease try again.")`, cancel, remove the listener
4. URI match rule: the reported URI starts with the expected `baseUrlWs` (a prefix compare).

### VerifiedConnectionEvent (observes UDP)

Add the listener, emit ConnectedToHub, wait 100 ms, then loop: send `ScanWifiNetworks`, wait
10 s, while `wifiNetworks` is empty. Each `ScanWifiNetworksReply` → `NetworkDiscoveredEvent`.

### NetworkDiscoveredEvent

`wifiNetworks[ssid] = reply`. If the state is ConnectedToHub, re-emit it so the list repaints.

### RefreshHubWifiNetworksEvent

Clear the map, `scanGeneration++`, send `ScanWifiNetworks`, emit ConnectedToHub. Used by
"Refresh Wifi Networks" and "Back to networks".

### SelectWifiNetworkEvent

Emit `SelectedNetworkState(network)`.

### ConnectHubToWifiEvent(network, password) (observes UDP)

1. Emit HubConnectingToWifi. Add the listener. `Timer.periodic(4 s)` (registered as
   `checkAndSaveSsidAndPassword`) runs `sendMessage`:
   - `checkNumber > 4` → cancel, remove the listener, advanced = true, `ErrorOccurredEvent("We
     weren't able to connect to your hub. \nPlease try again later.", "3b3cd169-f023")`
   - `checkNumber > 3` and no replies → the same message, code `"dbd39a14-b708"`
   - Otherwise send `CheckandSaveEncryptedSSIDandPassword(ssid, password)`. The first send is at
     4 s, not immediately.
2. `receive`: only the **first** `SaveSSIDandPasswordReply` or
   `CheckandSaveEncryptedSSIDandPasswordReply` counts (`shouldAdvanceOnReply`).
   1. Count it, advanced = true, cancel the timer, remove the listener.
   2. Breadcrumb 'credential ack received' `{messageType, result}`. The result is **not** acted
      on, because a hub with a wrong password still acks 1.
   3. `credentialAckAt = now`.
   4. Teardown, with errors swallowed and sent to Sentry: wait 2 s, `clearConnection`, wait 1 s,
      `forceWifiUsage(false)`, wait 1 s, `leaveHubNetwork`, wait 1 s.
   5. If the bloc is not closed → `StartCheckingIfHubConnectedToWifiEvent`.

### StartCheckingIfHubConnectedToWifiEvent

1. `startedAt = now`. Emit `CheckingIfHubConnected(startedAt, rejoiningNetwork)`.
2. Build a `HubRegistrationPoller`:
   - `probe` = `probeHubRegistration(device)`
   - `isForeground` = OS lifecycle is resumed, inactive or null
   - `onWaiting` → `HubStillRegisteringEvent`
   - `onRegistered` → `HubConnectedToWifiEvent`
   - `onAuthExpired` → `HubSessionExpiredEvent`
   - access-point probe:
     - `sinceAck` = now − `credentialAckAt` (or `startedAt`)
     - `join` = join AP, wait 500 ms, force Wi-Fi, wait 500 ms, clear, new socket
     - `ask` = send `GetFWVersion` and wait 8 s for a `GetFWVersionReply` only
     - `leave` = clear, null the socket, `forceWifiUsage(false)`, `leaveHubNetwork`
   - `onHubReverted` → `HubRevertedToAccessPointEvent`
3. Cancel any previous poller, set `activePoller`, then `await run()`.

### HubStillRegisteringEvent

Emit `CheckingIfHubConnected(startedAt, reason, showLightReadings)`.

### Terminal events

All four are guarded on the state being `CheckingIfHubConnected`. Each stops the timers, sets
`isPairingDevices = false` and `currentState = resumed`, captures the summary, and nulls the
poller.

| Event | Extra step | Summary outcome and code | Emits |
|---|---|---|---|
| CancelWaitingForHubEvent | cancels the poller | 'cancelled', `e5b1907d-C` | PairingStopped |
| HubConnectedToWifiEvent | | 'registered', no code | Success |
| HubSessionExpiredEvent | | 'auth_expired', `e5b1907d-A` | SessionExpired |
| HubRevertedToAccessPointEvent | | 'ap_reverted', `e5b1907d-P` | HubReverted |

### ErrorOccurredEvent(errorCode, errorMessage, errorDetail?)

1. If `teardownInFlight`, return. Otherwise set it.
2. Emit ReestablishConnectionToServer. `timerManager.stopAll()`.
3. If a poller is active: summary 'error' with the code, then cancel and null it.
4. Wait 250 ms, `clearConnection`, wait 250 ms, `forceWifiUsage(false)`, wait 250 ms,
   `leaveHubNetwork`.
5. `Sentry.captureException(GenericPairToWifiException(code, message))`.
6. Wait 3 s. `abandonRequested = false`.
7. `awaitServerReachable(isCancelled: emit.isDone || abandonRequested)`. Probes
   `GET {B}/test/`; **any** HTTP response counts as reachable. 90 s window, with the backoff in
   §2.
   - `windowClosed` → emit WifiReconnectFailed and return.
   - `cancelled` or `reachable` → `isPairingDevices = false`, `currentState = resumed`, then (if
     not done) emit `AnErrorOccurred(message, code, detail)`.
8. Finally `teardownInFlight = false`.

### ReestablishConnectionToServerEvent ("Try Reconnecting Again")

1. If `reconnectInFlight`, return. Otherwise set it.
2. If Wi-Fi is connected, leave it.
3. If not superseded (`teardownInFlight || emit.isDone`), emit ReestablishConnectionToServer.
4. Wait 250 ms. `abandonRequested = false`.
5. `awaitServerReachable(isCancelled: superseded || abandonRequested)`:
   - cancelled → return
   - superseded → return
   - windowClosed → WifiReconnectFailed
   - reachable → ReconnectToServerSuccessfully
6. Finally clear `reconnectInFlight`.

## 6. Leaving the flow (exit button, Back, Cancel)

- `pairingCanPop(state)`: see the "Back without confirming?" column in §4.
- `requestPairingExit(context)`:
  - canPop → `DevicesBloc.add(GoToDevicesHomeScreen())`.
  - Otherwise popup 'Stop Pairing?' / 'Your hub is part-way through setup. If you stop now it
    may not connect, and you will need to start again.', okay 'Keep pairing' (just closes),
    cancel 'Stop pairing':
    1. pop
    2. re-read the state
    3. now poppable → home
    4. else `abandonEventFor(state)`:
       - CheckingIfHubConnected → `CancelWaitingForHubEvent`
       - otherwise → `ErrorOccurredEvent('Pairing was cancelled. \nPlease try again later.',
         cancelledAt(state))`. Codes: ConnectingToHub `e5b1907d-J`, Verifying `-V`,
         ConnectedToHub `-N`, SelectedNetwork `-K`, HubConnectingToWifi `-S`,
         ReestablishConnection `-R`, otherwise `-C`.
- Exit button labels: 'Return to Devices' (Begin, Failure, PairingStopped, HubReverted) and
  'Cancel' (most steps). Some screens have no exit button: ViewWifiNetwork,
  WifiReconnectFailed, Success, Reestablish (which has its own Cancel).
- The **Reestablish screen's Cancel** works differently. When `teardownInFlight`, it sets
  `abandonRequested = true`, which ends the 90 s wait early. Otherwise it dispatches
  `ErrorOccurredEvent("Pairing was cancelled. \nPlease try again later.", "d63f9b07")`.

## 7. Screens (all use `PairingStepScaffold`, spec 07; copy verbatim)

`PairingStepScaffold` (`components/pairing/pairing_step_scaffold.dart`):

- `AppScaffold(showNavigation: false, actions: [SizedBox(50)])`. With no drawer there is no
  hamburger.
- Optional help FAB: amber, black `Icons.help_outline`, tooltip 'Help with this step'.
- `Expanded → SafeArea → LayoutBuilder → scroll`. Padding: horizontal 20, or 20% of the width
  when wider than 800; top 20; bottom 25.
- Column:
  1. If numbered: 'Step i of 6' (14, `#A2AAAD`, letter-spacing 1.1), then 10
  2. `heroLeads` → hero, then 25
  3. Title (20, w700, white, centred)
  4. `!heroLeads` → 25, then hero
  5. Subtitle → 10, then the subtitle (17, centred)
  6. 25
  7. If `exitLeads`, the exit button goes here
  8. The screen's children
  9. Otherwise, the exit button goes here
- Exit button: 10, then RoundedButton(exitLabel, FA arrowLeft, black icon and text, blue) →
  `PairingExit.request()`.

| Widget | Title / subtitle / hero | Children and actions |
|---|---|---|
| **BeginPairingHubWidget** | exit 'Return to Devices'; "Getting Your Hub Ready"; "Your hub needs a moment to switch into pairing mode. Start Pairing turns on when it is ready."; hero: a 150×150 `CircularProgressIndicator(value 1 − s/15, blue, background #54585A, stroke 15)` with a centred overlay (padding top 38): the remaining seconds "15"…"1" (50, bold, white), then FA check (amber, 75) at 0 | 'Start Pairing' (amber, black, FA rss), disabled until 0 → CheckingHubIsPluggedInEvent. A 1 s timer drives the countdown. |
| **CheckIfHubIsPluggedInWidget** | exit 'Cancel'; "Plug in Hub" / "Is your hub plugged in?"; hero: a white circle (padding 8) around a `#1D1E33` circle (padding 8) around `Icons.electrical_services` (125, white); help FAB → popup "Plugging In Your Hub" / 'Connect the power adapter to your hub and plug it into a wall outlet. Your hub needs to stay plugged in from now on. It is what keeps your sensors talking to Cartell.\n\nOnce it has power, a light next to the antenna will start to blink. Contact support if no light comes on at all.' (okay "Got it") | 'Yes' (amber, FA check) → VerifyThatHubIsPluggedInEvent |
| **VerifyingHubStateWidget** | exit 'Cancel'; "Check the Light on Your Hub" / "Does your Hub's light blink like this?"; hero: `HubLightWidget(AP mode)`; help FAB → help dialog | "(The light should be located next to the antenna)" (14, centred, padding h14 v10); 'Yes' (amber, FA check) → VerifyThatHubIsReadyToPairToWifiEvent; 'It blinks differently' (blue, FA rotate) → popup "Reset Your Hub?" / 'Resetting erases the Wi-Fi settings stored on your hub so it can start pairing again. Your account and your sensors are not affected.\n\nIf your hub is already working on another network, resetting it will disconnect it.' (okay "Keep trying", cancel "Reset the hub" → pop + HubIsNotInTheCorrectStateEvent); "I can't find the light" (blue, FA circleQuestion) → help popup "Finding the Light on Your Hub" / 'The light sits next to the antenna. It is small, and in daylight you may need to shade it with your hand.\n\nMake sure the hub is plugged in and has had a few seconds to start up. If you still cannot see any light at all, contact support.' (okay "Look again", cancel "Contact support" → `popAndPushNamed(ContactUs.id)`, which **throws because there are no routes, so it only closes the dialog**; spec 19) |
| **ResettingHubWidget** | exit 'Cancel'; "Hold the Reset Button In"; hero: `HubLightWidget(resetting)` | "Find the reset button on your hub and hold it in until the light blinks like above. Then release the button. Your hub's Wi-Fi settings are now reset." (16, centred, padding h14); 20; 'Once your hub has reset, press "The Hub Reset" below.'; 20; for the first 3 s an indeterminate LinearProgressIndicator (h40, radius 16, background #54585A, blue, padding v10); then 'The Hub Reset' (amber, FA check) → HubHasBeenResetEvent |
| **InitialConnectionWidget** | exit 'Cancel'; "Connect to Your Hub" / "Connect to the WiFi signal of the HUB."; hero `Icons.wifi` (125, white); help → "Connecting to Your Hub" / 'Press "Connect to Hub" and your phone will ask permission to join a temporary network named "Cartell Hub" followed by your hub\'s Mac Address. Confirm when your phone asks.\n\nYour phone leaves your home Wi-Fi while it hands the hub your network details, then rejoins on its own once setup finishes.\n\nIf no permission request appears, check that Wi-Fi is on and that your hub\'s light is still blinking.' ("Got it") | "Before you press the button, have your Wi-Fi password ready. Please ensure your network is 2.4GHz before proceeding. " (16, centred, with the trailing space); 20; **Android only**, when Wi-Fi is off (checked on init and on resume): a box (margin h14, padding 12, amber at 0.15, amber border, radius 8) with `Icons.wifi_off` amber, 12, "Your WiFi is turned off. Please enable WiFi to connect to your Hub." (amber 14), bottom padding 20; 'Connect to Hub' (amber, FA rss), disabled when Wi-Fi is off → StartConnectionEvent |
| **ConnectingToHubWidget** | 'Connecting to HUB' / "Your phone has to join the HUB's own network for this step."; hero `SpinKitFadingFour(white)`; exit 'Cancel'; help → "Joining the HUB's Network" / 'To set up your HUB, your phone leaves your home network and joins the network the HUB makes. Your phone asks permission before it does that.\n\nAnswer as soon as you see the prompt. If it goes unanswered this step times out, and you will have to start it again.\n\nIf you already tapped Cancel on it, cancel this step and begin again.' ('Got it') | 'Tap "<Join|Connect>" if your phone asks for permission.' (17, white, height 1.4, centred); 15; 'Your phone may ask each time it joins a HUB. Pairing cannot continue until you answer.' (14, `#A2AAAD`, height 1.4, centred) |
| **ValidatingConnectionWidget** | 'Checking Connection to HUB'; `SpinKitFadingFour`; exit 'Cancel' | none |
| **ListWifiNetworksWidget** | 'Select WiFi Network'; exit 'Cancel'; subtitle 'Choose the Wi-Fi network you want your hub to use. It must be a 2.4GHz network.'; hero `Icons.wifi` (125, white) | Divider (white60, padding h20); the list: empty and less than 8 s since this scan generation → [25, SpinKitRing amber, 20, 'Looking for networks...' (14 `#A2AAAD`), 25]; empty after 8 s → padding v25 [`Icons.wifi_find` (60, `#A2AAAD`), 15, 'No networks found' (17 w700), 10, 'Your hub can only see 2.4GHz networks. Check your router settings, then scan again.' (14 `#A2AAAD`, centred)]; otherwise ListTiles in insertion order (title the SSID at 17; trailing a Stack of the full-strength Wi-Fi icon (20, `#54585A`) under the RSSI icon (20, default colour)) → SelectWifiNetworkEvent; Divider; 25; "If your network does not appear in the list, it may not be a 2.4GHz network. Please check your router settings and ensure your network is set to 2.4GHz." (14 `#A2AAAD`, centred, padding h14); 25; 'Refresh Wifi Networks' (blue) → RefreshHubWifiNetworksEvent. RSSI icon: ≥ −60 `Icons.wifi`, ≥ −80 `Icons.wifi_2_bar`, else `Icons.wifi_1_bar`. |
| **ViewWifiNetworkWidget(network)** | 'Login To WiFi Network'; **no exit button, no help**; hero (padding 8): a Stack of the full Wi-Fi icon (150, `#54585A`) under the RSSI icon (150, white) | `KeyValuePairDisplay('Name', ssid)`; debug only: `KVP('RSSI', '<rssi> db')` and 'Scan QR Code Password - Debug Only' (blue); a Row of [an Expanded TextField with the **default Material 3 underline** decoration: hint 'Enter network password', `errorText` = 'This password is too long for the hub, which stores 64 characters. Accented and emoji characters use more than one each.' when it is more than 64 UTF-8 bytes (checked as you type), errorMaxLines 3, obscured, `autofillHints: []`, no suggestions, no autocorrect; IconButton `Icons.visibility` / `visibility_off` (20)]; 15; 'Connect' (amber, `#25282A`), null while the error shows: non-empty → ConnectHubToWifiEvent; empty → popup 'Connect without a password?' / '<ssid> will be joined as an open network, so anyone nearby can see the traffic between your hub and your router.' (okay 'Go back', cancel 'Connect anyway' → pop + ConnectHubToWifiEvent with ''); 'Back to networks' (blue) → RefreshHubWifiNetworksEvent |
| **StartHubConnectingToNetworkWidget** | 'Sending data to Hub'; `SpinKitFadingFour`; exit 'Cancel' | none |
| **CheckingIfHubConnectedToServerWidget** | "Checking Hub's connection..."; exit 'Cancel'; hero `SpinKitFadingFour(white)` | A centred Wrap (spacing 10, run 5) of [reason icon (20, `#A2AAAD`), reason text (17, `#A2AAAD`, centred)]: rejoiningNetwork `Icons.sync` 'Reconnecting your phone to your wifi network.'; waitingForHub `Icons.router` 'Waiting for your hub to reach our servers.'; reachingServer `Icons.wifi_off` 'Having trouble reaching Cartell. Still trying.'; checkingHub `Icons.travel_explore` 'Checking on your hub.'; hubNotAnswering `Icons.lightbulb_outline` 'Still waiting for your hub.'. Then 10, then '<m>:<ss> elapsed' (14 `#A2AAAD`; only this text ticks every 1 s); from 60 s on, 10 + 'This can take a few minutes.' (14 `#A2AAAD`, centred). When `showLightReadings`: 25, then HubLightReadings: 'Your hub has not reached us yet. The light on it says what is happening.' (17, centred); 20; four rows (padding bottom 15; Wrap spacing 15, run 5; a 40×40 slot; text 17, max width 260): `Icons.circle_outlined` (20, `#A2AAAD`, semantic 'No light') 'No power. Check that it is plugged in.'; HubLight(connected to server) 'Already set up. Check your Devices list.'; HubLight(Wi-Fi not server) 'On your Wi-Fi, but that network has no internet.'; HubLight(AP mode) 'Still waiting for setup. Try pairing again.' |
| **SuccessWidget(message)** | `heroLeads`; title = message; hero FA circleCheck (70, amber) | 'Continue' (blue, black) → `UserFeedback.requestUserFeedback(ctx, "Device connect to network success", after: GoToDevicesHomeScreen)` |
| **FailureWidget(message, code, detail?, firstTime)** | exit 'Return to Devices'; `heroLeads`; title = message; subtitle = detail; hero `Icons.wifi_off` (150, white) | firstTime (never true) → "Your Hub is added to your account. To connect, tap Return, then tap your hub, and tap Connect Hub." (padding `fromLTRB(0,30,0,20)`); 'Begin Pairing Again' (amber, black, FA rss) → BeginPairingHubEvent; 10; "Error: <code>" (15, `#A2AAAD`, centred) |
| **PairingStoppedWidget** | exit 'Return to Devices' with **exitLeads** (the exit comes first); `heroLeads`; 'Pairing stopped' / 'Your hub may already be connected.\nCheck your Devices list before pairing again.'; hero `Icons.schedule` (150, white) | 'Begin Pairing Again' (**blue**, FA rss) → Begin; 10; 'Code: e5b1907d-C' (14 `#A2AAAD`) |
| **HubRevertedWidget** | `heroLeads`; 'Your hub could not join that network' / 'It went back to waiting for setup, so the details it was given did not work.'; hero `HubLightWidget(AP mode)`; exit 'Return to Devices' | Bullets (`Icons.circle` 6 `#A2AAAD`, padding top 6 right 10; text 17; padding bottom 10): 'The Wi-Fi password, which is the usual cause.', 'That the hub is close enough to your router.', 'That your router is powered on and its network is up.'; 20; 'Try Again' (amber, FA rotateRight) → Begin |
| **ReestablishConnectionToServerWidget** | "Reconnecting to the server" / "Please wait"; hero: a 150×150 indeterminate CircularProgressIndicator (blue, background #54585A, stroke 15) | 'Cancel' (blue, no icon); behaviour in §6 |
| **WifiReconnectFailedWidget** | `heroLeads`; "Please verify your network connection and try again"; hero `Icons.wifi_off` (150, amber) | 'Try Reconnecting Again' (amber, FA rss) → ReestablishConnectionToServerEvent. No exit button. |

## 8. Sentry instrumentation (keep identical)

- Breadcrumbs (category `pairing`):
  - 'phone still on hub network' (from the network-name check while pairing)
  - 'registration probe unavailable' `{reason, errorType}`
  - 'verification timed out' `{stage, messagesSent, repliesReceived, socketExceptions}`, level
    error
  - 'verification message <Outcome>' `{stage, messageType}`
  - 'credential ack received' `{messageType, result}`
- `captureException`: socket bind failure; `GenericPairToWifiException(code, message)` on every
  ErrorOccurred; websocket URI send failure; teardown failure after the ack.
- `captureMessage('hub pairing registration poll ended: <outcome>', level info)` with context
  `hub_pairing = {outcome, error_code?, device_id, completed_checks, ever_reached_server,
  elapsed_seconds, unavailable_counts{reason: n}}`. It fires once per terminal poll path.

## 9. Verification references

- Tests: 24 files under `frontend/test/screens/devices/connect_hub_to_wifi/` plus
  `test/components/pairing/`, `test/udp_commands/` and `test/services/encryption_test.dart`
  (spec 20).
- Hardware: `frontend/docs/superpowers/DEVICE-VERIFICATION-427.md`. Measured behaviour from the
  root `CLAUDE.md`:
  - A hub given wrong credentials acks 1 and then returns to AP mode after 10 s.
  - A hub given correct credentials never answers on the AP again.
  - The AP-to-station transition includes a reboot.
- Tools for driving a real hub without the app: `backend/hubload/provision_hub`,
  `set_hub_ws_uri`, `discover_hubs` (root `CLAUDE.md`).
