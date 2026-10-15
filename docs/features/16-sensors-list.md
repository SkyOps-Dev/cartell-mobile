# 16 — Sensors List

## In short

Shows every sensor paired to one hub as a picture card with its name. The hub's built-in sensor,
if used, appears with its own picture and the label "Onboard Sensor". From here the user opens a
sensor or starts pairing a new one.

| | |
|---|---|
| **Who** | Hub owners |
| **Where** | Hub details → **Sensors**; back from any sensor screen; after the add-sensor wizard |
| **Flutter source** | `screens/sensors/sensors_screen.dart`, `components/sensors/sensor_card.dart`, `components/sensor_ellipsis.dart`, `bloc/devices/events/go_to_sensors_screen_event.dart` |
| **Detailed spec** | `docs/spec/13-sensors.md` §1, §2 |
| **Porting plan** | Phase 12 (12.1) |

## What the user sees

- **Top bar**: ☰, logo, **⋮** with one item, **"Pair Sensor"**.
- **←** (back to Hub details).
- **"Sensors"** (bold, letter-spaced, Source Sans Pro) and "View existing Sensors or add a Sensor".
- **No sensors**: a dark card with "No Sensors have been added.", a sensor icon, and "Press the plus
  button below to get started."
- **One sensor**: one centred square card, at most 300 px wide.
- **Two or more**: a two-column grid of square cards (with extra side margins on screens 800 px or
  wider).
- Each card: the **sensor name**, a **picture** (a photo of the black round Cartell sensor box; for
  the onboard sensor, a photo of a white tube-shaped probe on a coiled black cable),
  "Onboard Sensor" under the onboard one, and a **red circle badge** on the corner if the sensor
  is flagged (blacklisted).
- A round **amber +** button at the bottom-right.

The sensors come from the hub's record, in the order the server lists them.

## What happens when...

| The user... | What happens |
|---|---|
| taps a sensor | Opens [18 Sensor details](18-sensor-details.md) |
| taps **+** or ⋮ → **Pair Sensor** | Starts [17 Add a sensor](17-add-a-sensor.md) |
| pulls down | After 2 s the hub (and its sensor list) is reloaded. Errors are ignored silently. |
| taps **←** or presses Back | Hub details |
| opens the screen | The list appears at once from the hub already loaded, then the hub is reloaded in the background and the list updates |

## What the app asks of the server

| When | Request | Expects |
|---|---|---|
| Opening, pull-to-refresh | `POST /devices/{id}/message/get_health/`, then `GET /devices/{id}/` | the hub with `device.sensors`, each sensor having `id`, `sensor_id`, `name`, `latitude`, `longitude`, `has_low_battery`, `is_active`, `connection_date`, `disconnection_date`, `should_send_notification`, `fw_version`, `sensor_type` (`"ON"` = onboard), `is_blacklisted` |

## Odd but true

- **Sensor cards have no status text.** Battery and the alert switch are only on the sensor's own
  screen.
- **Q19**: the "flagged" badge does not update during a session if the server flags or un-flags a
  sensor after it was first loaded. It updates after the app restarts.

## Related

- [12 Hub details](12-hub-details.md) · [17 Add a sensor](17-add-a-sensor.md) ·
  [18 Sensor details](18-sensor-details.md)
