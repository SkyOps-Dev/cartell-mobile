# A1 — Server API Reference (What the App Needs from the Backend)

Every server address the mobile app calls, what it sends, what it expects back, and which feature
uses it. The backend is not changing, so the React Native app must call exactly these, with the
same paths (**including the inconsistent trailing slashes**), methods and body formats.

Detailed per-call notes (error codes, retry rules): `docs/spec/04-networking-and-api.md` §5.

## Rules that apply to every call

| Rule | Detail |
|---|---|
| Base address | `https://cartellap.com` (live), `https://test.cartellap.com`, `https://beta.cartellap.com`, or `http://<LAN IP>:8000` for development ([29](29-environments-and-test-builds.md)) |
| Sign-in header | `Authorization: JWT <access token>`. Literally "JWT", not "Bearer". Omitted where the table says "no auth". |
| Body format | Web form (`application/x-www-form-urlencoded`), **not JSON**, including on `DELETE` and on empty bodies. Booleans are the text `"true"` / `"false"` (pairing mode uses `"True"` / `"False"`). Two exceptions are noted below. |
| Time limit | 15 seconds per request |
| Maintenance pre-check | Before each call: `GET /maintenance-mode/` ([07](07-maintenance-and-no-connection.md)) |
| Hub-network guard | The call is refused inside the app if the phone is on a "Cartell Hub ..." Wi-Fi ([07](07-maintenance-and-no-connection.md)) |
| Session check | Most calls first run the session check ([06](06-session-and-log-out.md)) |
| 401 handling | Renew the session once, then repeat the call once |
| Responses | JSON, decoded as UTF-8 |

## Status and diagnostics

| Method & path | Auth | Sends | Expects | Used by |
|---|---|---|---|---|
| `GET /maintenance-mode/` | no | | 200 = normal; other status = maintenance; no answer = unreachable | Every call; 15-second timer; Retry |
| `GET /test/` | no | | 200 (debug test). During pairing recovery, **any** answer counts as reachable. | Debug connection test; pairing reconnect |
| `GET /` (server home page) | no | | 200 | Debug connection test |
| `POST /echo/` | no | **JSON** body `{"msg":"this is a test"}` | 200 and the same `msg` echoed back | Debug connection test |
| `GET https://google.com` | no | | 200 | Debug connection test (internet check) |

## Accounts and sessions

| Method & path | Auth | Sends | Expects | Used by |
|---|---|---|---|---|
| `POST /auth/users/` | no | `email`, `first_name`, `last_name`, `password`, `phone_no` (may be empty) | **201** created; 4xx with `{field: [messages]}` | [03 Register](03-create-an-account.md) |
| `POST /auth/jwt/create` | no | `email`, `password` | 200 `{access, refresh}`; 401 bad credentials | [04 Log in](04-log-in.md) |
| `POST /auth/jwt/verify` | no | `token` | 200 if valid | [06 Session](06-session-and-log-out.md) |
| `POST /auth/jwt/refresh` | no | `refresh` | 200 `{access, refresh}` (both replaced) | [06 Session](06-session-and-log-out.md) |
| `GET /auth/users/me/` | yes | | `{id, email, first_name, last_name, phone_no, should_send_emails}` | Start-up, login, menu header, account settings, edit phone, feedback |
| `PATCH /auth/users/me/` | yes | `first_name` + `last_name`, **or** `phone_no`, **or** `should_send_emails` | 200 | [23 Edit](23-edit-name-phone-and-password.md), [22 Account](22-account-settings.md) |
| `POST /auth/users/set_password/` | yes | `current_password`, `new_password` | below 300 | [23 Change password](23-edit-name-phone-and-password.md) |
| `DELETE /auth/users/me/` | yes | `current_password` | (not checked) | [24 Delete account](24-delete-account.md) |
| `GET /profiles/me` *(no slash)* | yes | | `{user, should_send_notification, locations: [{id, name, devices}], alexa_enabled}` | Account settings, Add hub, Alexa guide |
| `PATCH /profiles/me/` *(slash)* | yes | `should_send_notification` | 200 | [22 Account](22-account-settings.md) |
| `GET /app/settings/?code=alexa_enabled` | yes | | `{id, key, value}`; `value` read as true/false | Account settings, Help |

Also exists in the app, never called by any screen: `GET /auth/users/me/` through a second
helper.

## Push notifications

| Method & path | Auth | Sends | Expects | Used by |
|---|---|---|---|---|
| `POST /notifications/register_device/` | yes | `token`, `device_name`, `platform` (`Android` / `iOS`) | anything | [20](20-notifications.md): start-up, login, Hubs list, token refresh |
| `POST /notifications/register_device/validate/` | yes | `token` | `{"valid": true/false}` | Login |
| `DELETE /notifications/register_device/` | yes | `token` | ignored | Log out |

## Hubs

| Method & path | Auth | Sends | Expects | Used by |
|---|---|---|---|---|
| `GET /devices/` | yes | | list of hubs (fields below) | Start-up, login, [09 Hubs list](09-hubs-list.md), all-history refresh |
| `GET /devices/{id}/` | yes | | one hub | Every hub screen, pairing checks, add-sensor checks |
| `POST /locations/{locationId}/devices/` | yes | `name`, `mac_address` = HMAC-SHA256 hex of the lower-case MAC | below 300 with `id`; 4xx `non_field_errors` | [10 Add hub](10-add-a-hub.md) |
| `DELETE /devices/{id}/` | yes | | below 300 | [14 Delete hub](14-rename-about-and-delete-a-hub.md) |
| `PATCH /devices/{id}/` | yes | one of: `name`, `should_send_notification`, `should_send_connection_notification`, `should_send_email`, `should_use_emulated_sensor`, `should_use_onboard_sensor` (this one skips the session check) | 200 | [13 Hub settings](13-hub-settings.md), [14 Rename](14-rename-about-and-delete-a-hub.md) |
| `GET /devices/{id}/sensors` *(no slash)* | yes | | list of sensors | [17 Add sensor](17-add-a-sensor.md) |
| `GET /devices/{id}/activations` *(no slash)* | yes | | event page | [21 Hub history](21-event-history.md) |
| `GET /devices/{id}/check_existing_firmware_update/` | yes | | 200/202 list of running updates | [15 Firmware](15-firmware-updates.md) |

### Hub commands (the server forwards these to the hub over its live connection)

| Method & path | Sends | Expects | Used by |
|---|---|---|---|
| `POST /devices/{id}/message/get_health/` | (empty) | below 300; failures only reported | Before every single-hub load that refreshes a screen (hub details, settings, about, sensors, firmware, add-hub success, entering pairing), and for each connected hub at start-up. Not before the repeated "is it connected yet?" checks in pairing and add-sensor. |
| `POST /devices/{id}/message/set_pairing_mode/` | `is_enabled` = `True` / `False` | not above 450 | [17 Add sensor](17-add-a-sensor.md) |
| `POST /devices/{id}/message/trigger_integrator/` | (empty) | below 300 | **Open Gate** ([12](12-hub-details.md)) |
| `POST /devices/{id}/message/pair_to_integrator/` | (empty) | below 300 | **Pair Integrator** ([13](13-hub-settings.md)) |
| `POST /devices/{id}/message/pair_to_sounder/` | (empty) | below 300 | **Pair Sounder** ([18](18-sensor-details.md)) |
| `POST /devices/{id}/message/update_firmware/` | `firmware` = firmware id | below 300 `{fw_update_id}`; else `non_field_errors` | [15 Firmware](15-firmware-updates.md) |

### Hub record fields the app reads

`id`, `name`, `location`, `latitude`, `longitude`, `archived`, `archived_date`, `added_date`
(required), `should_use_onboard_sensor`, `should_send_notification`,
`should_send_connection_notification` (**required, must not be null**), `should_send_email`,
`should_use_emulated_sensor`, and `device`:
`{id, is_connected, mac_address, esp32_app_version, rfm6601_app_version, is_blacklisted,
device_model: {name, release_date}, connections: [{ip_address, port, is_active, connection_date,
disconnection_date}], sensors: [...]}`.

## Sensors

| Method & path | Auth | Sends | Expects | Used by |
|---|---|---|---|---|
| `GET /sensors/{id}/` | yes | | one sensor | [18 Sensor details](18-sensor-details.md), history, about |
| `PATCH /sensors/{id}/` | yes | `name`, **or** `latitude` + `longitude`, **or** `should_send_notification` | below 300 (200 for notifications) | [17](17-add-a-sensor.md), [18](18-sensor-details.md), [19](19-sensor-location-rename-about-delete.md) |
| `DELETE /sensors/{id}/` | yes | | below 300 | [19 Delete sensor](19-sensor-location-rename-about-delete.md) |
| `GET /sensors/{id}/activations/` *(slash)* | yes | | event page | [21 Sensor history](21-event-history.md) |

Sensor fields read: `id`, `sensor_id`, `name`, `latitude`, `longitude` (text), `has_low_battery`,
`is_active`, `connection_date` (required), `disconnection_date`, `should_send_notification`,
`fw_version`, `sensor_type` (`"ON"` = onboard), `is_blacklisted`.

## Events

| Method & path | Auth | Expects | Used by |
|---|---|---|---|
| `GET /activations` *(no slash)* | yes | page `{count, next, previous, results}` | [21 All history](21-event-history.md) |
| the `next` URL from a page | yes | the following page. The app forces `https:` (or `http:` on non-HTTPS dev servers) | all three histories |

Each result: `id`, `device`, `device_name`, `sensor`, `sensor_name`, `event_type` (`AC`, `CO`,
`DC`), `time` (ISO-8601), `location`, `added_date`.

## Firmware

| Method & path | Auth | Expects | Used by |
|---|---|---|---|
| `GET /latest-esp32-app/` | yes | list; first item = newest controller firmware `{id, version_number, release_date, stable, supported, processor}` | [15](15-firmware-updates.md) |
| `GET /latest-rfm6601-app/` | yes | same for the transmitter | [15](15-firmware-updates.md) |
| `GET /firmware_update/{id}` *(no slash)* | yes | `{id, status, file_size, file_cursor, message, date_started, date_ended, firmware}` | [15](15-firmware-updates.md), once per second |

## Called by nothing the user can reach

Present in the code, never triggered ([A4](A4-hidden-and-unused-features.md)):
`POST /produced-devices/validate-produced-device/`, `POST /devices/{id}/message/get_firmwares/`,
`POST /locations/`, `PATCH /locations/{id}/`.

## Not the Cartell server

| Target | Purpose |
|---|---|
| The hub itself, UDP `192.168.4.1:5002` (replies to port 6452) | Wi-Fi pairing ([11](11-connect-hub-to-wifi.md)) |
| Firebase Cloud Messaging | Push token and delivery ([20](20-notifications.md)) |
| Sentry | Errors and feedback ([31](31-error-reporting-and-logging.md)) |
| Firebase Analytics (Android) | Automatic usage data |
| Websites | Support, FAQ, About, password reset, Alexa skill ([32](32-permissions-and-platform-behaviour.md)) |
