# 17 — Add (Pair) a Sensor

## In short

Pairing a sensor links a new wireless sensor to a hub. The user names it, opens its case, and
presses its red button. Meanwhile the app has put the hub into "listening for a new sensor" mode
and watches the hub's sensor list for up to about a minute. When a new sensor appears, the app
gives it the chosen name. Unlike hub pairing, the phone never talks to the sensor or hub directly;
everything goes through the server.

| | |
|---|---|
| **Who** | Hub owners adding a sensor |
| **Where** | Sensors list → **+**, or ⋮ → **Pair Sensor** |
| **Flutter source** | `screens/sensors/add_sensor/00_enter_name_for_add_sensor.dart`, `01_remove_case_for_add_sensor.dart`, `02_sensor_connect_screen.dart`, `services/immediate_timer.dart`, `services/requests/device_requests.dart` (`setPairingModeRequest`, `isDeviceConnectedRequest`), `sensor_requests.dart` |
| **Detailed spec** | `docs/spec/13-sensors.md` §7 |
| **Porting plan** | Phase 12 (12.5) |

## Screen 1 — "Add a sensor"

- Top bar (☰, logo). **←**.
- "Add a sensor", a large amber house-with-signal icon.
- A centred text field, "Name of sensor", up to **32 characters** with a "0/32" counter.
- **Continue** (blue). There is **no check**: an empty name is allowed.
- **←** or Back → Sensors list.

While this screen is open, the app quietly reloads the hub to make a note of the sensors it
already has. That list is how screen 3 recognises the new sensor.

## Screen 2 — "Prepare to add"

- Top bar with **X**. **←**.
- "Prepare to add", a large amber magnifying glass.
- "Remove the top of the sensor's case. (blank line) Find the red button. (Don't press it yet.)"
- **I see the red button!** (blue) → screen 3.
- **X**, **←** or Back → Sensors list.

## Screen 3 — searching

### What the user sees

- **Searching**: "Press and release the red button for 1 second" (bold), a pulsing white circle,
  "Searching for sensor... 60" counting down, and **Cancel**.
- **Found**: "The sensor has successfully connected to the Hub.", a green ✓, **Continue** →
  Sensors list.
- **Not found / failed**: the reason (below), a red ✗, **Return** → Sensors list.

### What happens

1. The app asks the server whether the hub is **connected**. If not → failure "Hub is not
   connected. Reconnect it, wait 15 seconds, and then try again."
2. It tells the hub to **turn on sensor pairing mode** (the hub's light shows "Sensor Pairing
   Mode", slow blue flashes).
3. Immediately, and then **every second**:
   - checks the session (if that fails, skips this second)
   - checks the hub is still connected (if not → the failure above)
   - counts down by one; at 0 → failure "The sensor was unable to connect to the Hub. Please try
     again. If the problem persists, please contact support."
   - fetches the hub's sensor list; if it is **longer** than when screen 1 opened, the sensor
     that was not there before is the new one → **Found**. The app then renames it to the name
     typed on screen 1.
4. Whenever the search ends (found, failed or timed out), the app tells the hub to **turn pairing
   mode off**.
5. **Cancel** stops the search, turns pairing mode off, and returns to the Sensors list.

The countdown starts at 60, but each tick waits for several network requests, so the search
usually lasts somewhat longer than a minute.

## What the app asks of the server

| When | Request | Sends | Expects |
|---|---|---|---|
| Screen 1 opens | `POST /devices/{id}/message/get_health/`, `GET /devices/{id}/` | | hub with current `device.sensors` |
| Screen 3 starts, and every second | `GET /devices/{id}/` | | `device.is_connected` |
| Screen 3 starts | `POST /devices/{id}/message/set_pairing_mode/` | `is_enabled` = `True` | status up to 450 accepted |
| Every second | `GET /devices/{id}/sensors` (no trailing slash) | | list of sensors |
| Sensor found | `PATCH /sensors/{newId}/` | `name` | below 300 |
| Search ends / Cancel | `POST /devices/{id}/message/set_pairing_mode/` | `is_enabled` = `False` | |

## When something goes wrong

| Situation | Message on screen 3 |
|---|---|
| Hub offline at the start or during the search | "Hub is not connected. Reconnect it, wait 15 seconds, and then try again." |
| No new sensor before the countdown ends | "The sensor was unable to connect to the Hub. Please try again. If the problem persists, please contact support." |
| Could not turn on pairing mode | Nothing immediately. The app does not wait for that request, so its failure goes unnoticed (error report only) and the search carries on until it times out with the "unable to connect" message. |
| Renaming the new sensor fails | Nothing. The success screen is already showing; the sensor keeps its server-given name. |

## Odd but true

- **Q10**: the name is not checked, and the "existing sensors" note is made in the background. If
  the user taps **Continue** within a moment of opening screen 1, the note may still be empty, so
  the first existing sensor looks "new" and gets renamed.
- **Q11**: Android **Back** on screen 3 returns to the Sensors list **without** turning off the
  hub's pairing mode. Only **Cancel** and the end of the search turn it off.
- The search compares sensor *counts*, so pairing a sensor while another is deleted elsewhere could
  confuse it.
- An empty name is sent to the server as an empty name if the user left the field blank.

## Related

- [16 Sensors list](16-sensors-list.md) · [18 Sensor details](18-sensor-details.md) ·
  [28 Hub light guide](28-hub-light-guide.md)
