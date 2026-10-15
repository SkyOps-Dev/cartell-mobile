# 04 — Networking and the API Contract

Plan steps: 4.8, 4.9, 4.10. Sources: `services/request.dart`, `services/requests/*.dart`,
`services/auth_manager/check_creds.dart`, `utilities/start_services.dart`,
`utilities/AppWatchers/*`.

The backend is unchanged, so the RN app must send **the same requests**.

## 1. `NetworkHelper(url)`: every authenticated or unauthenticated call

For each of `getSecureData`, `postSecureData(body)`, `patchSecureData(body)`,
`secureDelete(body)` and `getUserData`:

1. `mode = validateServerMode()`, then `ModeWatcherHelper().notifyListeners(mode)`. This probes
   `GET {baseUrlHttp}/maintenance-mode/` **before every API call** (§2).
2. If `NetworkHelper.shouldCheckNetworkName` (always true), run `NetworkNameCheck.checkName()`.
   It **throws `OnHUBNetworkException`** when the phone's Wi-Fi SSID matches
   `Cartell Hub ([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})` and the check has not been deactivated
   (it never is).
   - Sentry: outside pairing, `captureException(OnHUBNetworkException())`. While
     `ModeWatcherHelper().isPairingDevices`, a breadcrumb only (category `pairing`, message
     `phone still on hub network`, level info).
   - SSID read: `network_info_plus.getWifiName()` with surrounding double quotes stripped. A null
     SSID passes. A read error is captured as `UnableToGetWifiInfoException("Error Code cbf7f:")`
     and treated as null.
3. Build the headers. When authenticating: `Authorization: JWT <access token or "">`.
4. Send. Bodies are `Map<String,String>`, so `application/x-www-form-urlencoded; charset=utf-8`
   (the `http` package's default encoding for a map body). DELETE carries a form body too.
5. Timeout **15 s**. A `TimeoutException` is captured with the per-method code and then
   `TimeOutException` is thrown:

   | Method | Sentry code |
   |---|---|
   | get | `4f0ef` |
   | post | `64773` |
   | patch | `a0af6` |
   | delete | `191d2` |
   | getUserData | `7928a` |

6. When authenticating, the request goes through `AuthorizedRequester.execute` (§4).
   `shouldAuthenticate:false` sends once without the header.

`getUserData` parses `User` on 200 and throws `Exception('Failed to load data')` otherwise. It is
not used by any screen, but port it.

## 2. Server mode (`validateServerMode`)

- Only probes when `ModeWatcherHelper().currentState == resumed` **and** not `isPairingDevices`.
  Otherwise it returns `NORMAL`.
- If `NetworkNameCheck` throws `OnHUBNetworkException`, it returns `NORMAL`.
- `GET {base}/maintenance-mode/` with a 15 s timeout: 200 gives `NORMAL`, any other status gives
  `MAINTENANCE_MODE`, any exception gives `UNREACHABLE`.
- Listeners: `AuthBlocWidget.updateMode` → `ModeDebouncer` (§6) → `MaintenanceModeEvent` or
  `AutoLoginEvent` (spec 08 §7).

## 3. Background auth timer (`utilities/start_services.dart`)

At startup, `Timer.periodic(15 s)` calls `AuthRequestManager().auth(shouldForceAuth:false)` for
the life of the process and logs `"running timer"`, `"run#N"` and the outcome. Through
`auth()` → `validateServerMode()` this also re-probes maintenance mode every 15 s while the app
is resumed, including on the Welcome screen.

## 4. Auth

### `AuthorizedRequester.execute(send)`

Response ≠ 401 → return it. On 401, call `refreshAuth(shouldForceAuth:true)`:

- `OFFLINE` → throw `TimeOutException`.
- Failed → throw `AuthExpiredException(messages.join('; ') or 'unknown')`.
- Otherwise send **once more** and return that response, even if it is another 401.

### `AuthRequestManager.auth({shouldForceAuth=false})`

1. Probe the mode, then notify listeners.
2. `UNREACHABLE` → `Result.offline()`. This runs before the cache check.
3. Cache: if `lastAuthed` is recent and the call is not forced, return `Result.success()`.
   The rule is `difference.inSeconds < 60`: a whole-second truncation, so 59.9 s is cached and
   60.0 s is not. The Flutter test named "exactly-60-seconds-old cache is treated as still
   valid" actually uses 59 s; port the rule, not the name.
4. Single flight: if a refresh is already running, await it.
5. `_doAuth`:
   - An access token exists: `POST /auth/jwt/verify` `{token}`. 200 sets `lastAuthed` and
     succeeds.
   - No refresh token → `Result.notSignedIn()`. No Sentry event.
   - `POST /auth/jwt/refresh` `{refresh}`. On 200, persist the **new access and refresh
     tokens** (rotating), set `lastAuthed`, succeed.
   - Otherwise `Sentry InvalidTokensException("Error Code 66c58:")` and failure "Neither access
     nor request token were valid.".
   - Any exception → failure "Failed to Authenticate".
   - Helpers capture `StoredCredentialsException` codes `045c9` (refresh) and `675e0` (verify)
     and rethrow.

## 5. Endpoint contract

`B` = `baseUrlHttp`. "auth()" means the function first calls `AuthRequestManager().auth()` and,
on failure, throws the listed exception (with a Sentry capture where a code is shown). "≥/≤"
gives the success status rule. Copy the URLs exactly, **including the inconsistent trailing
slashes**.

### Account and session

| Function | Request | Success | Failure |
|---|---|---|---|
| `register` | `POST B/auth/users/` no auth `{email, first_name, last_name, password, phone_no (""\|value)}` | returns the response (201 checked by the caller) | exception → Sentry `AccountCreationFailedException 5c9f3`, **returns null** |
| `login` | `POST B/auth/jwt/create` no auth `{email, password}` | returns the response | exception → Sentry `NoAccountInformationFoundException 11dd3`, returns null |
| verify | `POST B/auth/jwt/verify` `{token}` no auth | | |
| refresh | `POST B/auth/jwt/refresh` `{refresh}` no auth | JSON `access`, `refresh` | |
| `setProfile` | auth() (`UpdateStoredCredentialsFailedException b323c`); `GET B/profiles/me` | 200 → Profile | `NoAccountInformationFoundException 9eae2` |
| `setUser` | auth() (`e6196`); `GET B/auth/users/me/` | 200 → User | `NoAccountInformationFoundException 15955` |
| `updateUserData(body)` | auth() (`418d4`); `PATCH B/auth/users/me/` body | 200 | `UnableToUpdateUserInformationException 68abd` |
| `setProfileNotificationPolicy(v)` | auth() (`8ba3d`); `PATCH B/profiles/me/` `{should_send_notification: "true"\|"false"}` | 200 | `aa1dc` |
| `setUserEmailNotificationPolicy(v)` | auth() (`5e49a`); `PATCH B/auth/users/me/` `{should_send_emails}` | 200 | `f5e37` |
| `updateUserPassword(body)` | auth() (`7e945`); `POST B/auth/users/set_password/` `{current_password, new_password}` | returns the response (caller checks < 300) | |
| `deleteAccount(password)` | auth() (`UnableToDeleteUserAccountException 7e945`); `DELETE B/auth/users/me/` `{current_password}`; **then always** purge legacy, delete biometrics pref, refresh and access tokens | returns the response (**not checked** by the caller; spec 19) | |
| `getSetting(key)` | auth() (`FetchSettingsException b323c`); `GET B/app/settings/?code=<key>` | 200 → Setting | `NoAccountInformationFoundException 9eae2` |

### Push tokens (spec 09)

| Function | Request |
|---|---|
| `postMessagingData` | `POST B/notifications/register_device/` `{token, device_name, platform}` (authenticated) |
| `validateMessagingData` | `POST B/notifications/register_device/validate/` `{token}` → JSON `valid` |
| `deleteMessagingData` | `DELETE B/notifications/register_device/` `{token}` |

### Hubs (devices)

| Function | Request | Notes |
|---|---|---|
| `fetchDevices` | auth() (throws `Exception('Failed to fetch devices')`); `GET B/devices/` | 200 → list of Device. Else `NoHubInformationAvailableException befba`. |
| `setDevice(id)` | auth() (`a54db`); **`queryHubHealth(id)` first**; `GET B/devices/{id}/` | 200 → Device. Else `e412a`. |
| `probeHubRegistration(device)` | `GET B/devices/{id}/` (no explicit auth()) | non-2xx → `HubCheckUnavailable(server)`; parse → `HubRegistered` / `HubNotYetRegistered`; exception → classify plus breadcrumb `registration probe unavailable` `{reason, errorType}` (spec 16) |
| `isDeviceConnectedRequest(device)` | auth() (failure → false); `GET B/devices/{id}/` | parse `device.is_connected`. Exception → `205f8`, false. |
| `addDevice(locationId, body)` | auth() (`791fa`); `POST B/locations/{locationId}/devices/` `{name, mac_address: <HMAC>}` | returns the response |
| `deleteDevice(id)` | auth() (`cda7f`); `DELETE B/devices/{id}/` | < 300 OK, else `5486f` |
| `setDeviceNotificationPolicy` | auth() (`f7061`); `PATCH B/devices/{id}/` `{should_send_notification}` | 200, else `69f90` |
| `setDeviceConnectionNotificationPolicy` | same, `{should_send_connection_notification}` | |
| `setDeviceEmailNotificationPolicy` | same, `{should_send_email}` | |
| `setDeviceIntegratorSupport` | same, `{should_use_emulated_sensor}` | |
| `setOnboardSensor(id, v)` | **no auth()**; `PATCH B/devices/{id}/` `{should_use_onboard_sensor}` | 200, else `41ef1` |
| `updateDeviceData(id, body)` | auth() (`c43be`); `PATCH B/devices/{id}/` `{name}` | 200, else `80ae9` |
| `validateProducedDevice(mac)` | `POST B/produced-devices/validate-produced-device/` `{mac_address}` → `valid` | **unused** (commented out in the add-hub flow) |
| `pairToIntegrator(id)` | `POST B/devices/{id}/message/pair_to_integrator/` `{}` | < 300, else `7466e` |
| `triggerIntegrator(id)` | `POST …/message/trigger_integrator/` `{}` | same code |
| `pairToSounder(id)` | `POST …/message/pair_to_sounder/` `{}` | same code |
| `setPairingModeRequest(on, device)` | auth() (throws `Exception('An error occurred, please try again.')`); `POST …/message/set_pairing_mode/` `{is_enabled: "True"\|"False"}` | status > 450 → Sentry plus throw |
| `queryHubHealth(id)` | auth() (throws as above); `POST …/message/get_health/` `{}` | ≥ 300 → Sentry `70a42`, **no throw** |
| `queryHubFirmwares(id)` | `POST …/message/get_firmwares/` | unused (commented out) |
| `startFwUpdateAndGetFileSize(device, fw)` | auth() (throws `UpdateTokenFailedException('Failed to start the firmware update')`); `POST …/message/update_firmware/` `{firmware: <id>}` | < 300 → JSON `fw_update_id`; else `non_field_errors` (list joined by spaces) → `FirmwareUpdateRejectedException`; else `03337` plus `NoHubInformationAvailableException` |
| `checkForRunningFirmwareUpdate(id)` | auth() (`UpdateTokenFailedException 2a380`); `GET B/devices/{id}/check_existing_firmware_update/` | 200/202 → list of FirmwareUpdate; else `UnrecognizedFirmwareUpdate d7562` |
| `getLatestESP32APPFirmware` | auth() (`2a380`); `GET B/latest-esp32-app/` | 200 → `[0]` as Firmware; else `ESP32UnableToGetLatestFirmware d7562` |
| `getLatestRFM6601APPFirmware` | `GET B/latest-rfm6601-app/` | same pattern, `RFM6601…` |
| `getDeviceUpdateStatus(id)` | auth() (result ignored); `GET B/firmware_update/{id}` (no trailing slash) | parse; any error → Sentry and **rethrow** |

### Sensors

| Function | Request | Notes |
|---|---|---|
| `setSensors(deviceId)` | auth() (`UpdateStoredCredentialsFailedException 11ebc`); `GET B/devices/{id}/sensors` (no slash) | < 300 → list. Else `UnableToUpdateSensorEventsException 04c7b`. |
| `setSensor(deviceId, sensorId)` | auth() (`c3f22`); `GET B/sensors/{id}/` | < 300, else `40b27` |
| `deleteSensor` | auth() (failure → **silently return**); `DELETE B/sensors/{id}/` | < 300, else `10a37` |
| `updateSensorData(body)` | auth() (`b323c`); `PATCH B/sensors/{id}/` `{name}` or `{latitude, longitude}` | < 300, else `10a37` |
| `setSensorNotificationPolicy` | auth() (`b323c`); `PATCH B/sensors/{id}/` `{should_send_notification}` | 200, else `10a37` |

### Events and locations

| Function | Request | Notes |
|---|---|---|
| `setEventData(nextURL?)` | auth() (`UpdateTokenFailedException 4b6cf`); `GET B/activations` (no slash) or the `next` URL | `next` scheme rewritten: TLS → `http:`→`https:`, else the reverse. 200 → Event page. Else `UnableToUpdateExceptions "Error Message 59538:"`. |
| `setSensorEventData(sensor, nextUrl?)` | auth() (`df3dc`); `GET B/sensors/{id}/activations/` | else `0161e` |
| `setDeviceEvents(deviceId, nextURL?)` | auth() (`24b87`); `GET B/devices/{id}/activations` | else `50748` |
| `addLocation(body)` | `POST B/locations/` | only used by dead code |
| `updateLocationData` | `PATCH B/locations/{id}/` | unused |

## 6. Mode watching

- `ModeWatcherHelper` is a singleton with `currentState` (lifecycle state; updated by the
  `ModeWatcher` widget, and **forced to `paused` during pairing** — spec 16), `isPairingDevices`,
  and listeners with add, remove and notify.
- `ModeDebouncer` (initial NORMAL):
  - Same mode as last emitted → hold.
  - Entering or leaving the unavailable group (MAINTENANCE or UNREACHABLE) → emit immediately.
  - Switching between MAINTENANCE and UNREACHABLE needs two consecutive agreeing probes.
    Oscillation never emits.

## 7. Token and session helpers (`check_creds.dart`)

- `sendFCMToken()`: no stored token → log and return. Otherwise `postMessagingData(token,
  'token', deviceName, platform)`. Exception → Sentry `SendTokenFailedException("Error Code
  938dc:")`.
- `fullLogin()`: `NotificationApi.init()` (permission request), then `sendFCMToken()`
  (not awaited, not on web).
- `validateToken()`: no token → false; else POST validate → `response['valid']`. Exception →
  Sentry, false.
- `successfulLoginStartup(response)`: store `access` and `refresh`, then purge legacy
  credentials.
- `queryAllHubsHealth()`: `fetchDevices`, then `queryHubHealth` for each **connected** hub.
- `autoLoginMethodOnTheLoadScreen()`: `auth()` (failure → `Result.failure("Failed to
  authenticate")`) → `NotificationApi.init()` (not awaited) → `validateFCMToken()` →
  `queryAllHubsHealth()` → `setUser()` → success.
- `validateFCMToken()`: `NotificationApi.init()`, `FirebaseMessaging.getToken()` (null → failure),
  store it if it differs, **always** `sendFCMToken()`.
- `getFCMToken()` (used by login): `validateToken()`; then a newer Firebase token → store plus
  send; or valid and stored → send; else `getToken()`, store, send.
