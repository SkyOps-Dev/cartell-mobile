# 19 — Sensor Location, Rename, Info and Delete

## In short

The housekeeping actions for one sensor, from its ⋮ menu: put it on the map (by typing
coordinates or using the phone's current location), rename it, see which hub it belongs to and
when it was paired, or delete it.

| | |
|---|---|
| **Who** | Hub owners |
| **Where** | Sensor details → ⋮ → **Rename Sensor** / **Edit Coordinates** / **About** / **Delete Sensor**; also **Set Location** and **About** buttons on Sensor details |
| **Flutter source** | `screens/sensors/edit_coordinates.dart`, `screens/sensors/edit_sensor.dart`, `screens/sensors/sensor_meta.dart`, `screens/sensors/sensor_view.dart` (delete) |
| **Detailed spec** | `docs/spec/13-sensors.md` §3–§6 |
| **Porting plan** | Phase 12 (12.3, 12.4) |

## Set the sensor's location (Edit Coordinates)

### What the user sees

- Top bar (☰, logo, spacer). **←**, a satellite-dish icon, **"Sensor Coordinates"** in amber.
- "Set Your Sensor Coordinates." and "Enter Coordinates in DMS format."
- **Latitude** and **Longitude** fields, filled in if the sensor already has a location (normal
  keyboard).
- **Detect Location** (blue, map-pin icon).
- **Submit** (amber).

### What happens when...

| The user... | What happens |
|---|---|
| taps **Detect Location** | The app checks location services and permission, asking for permission if needed, then reads the phone's position (high accuracy) and fills both fields with the full-precision numbers |
| taps **Submit** | Both fields must be numbers. If so, each is cut to at most **6 decimal places** (not rounded) and saved. The app then returns to Sensor details. |
| taps **←** or presses Back | Sensor details, without saving |

### When something goes wrong

All shown as a popup titled **"Can't Get Location"**:

| Situation | Message |
|---|---|
| Location services off on the phone | "Location services are turned off on this device. Turn them on in Settings, or type the coordinates in by hand." |
| Permission refused when asked | "Cartell needs location access to place this sensor. Allow it when prompted, or type the coordinates in by hand." |
| Permission permanently refused | "Location access is turned off for Cartell. Turn it on in Settings > Cartell > Location, or type the coordinates in by hand." |
| No position fix (indoors, timeout) | "Could not get a location fix. Move somewhere with a clearer view of the sky and try again, or type the coordinates in by hand." |

On **Submit** with an empty or non-numeric field: popup **"Coordinates Needed"** / "Enter a latitude
and longitude, or tap Detect Location to use where you are now."

If the save itself fails, nothing is shown (Q27).

### What the app asks of the server

`PATCH /sensors/{sensorId}/` with `latitude` and `longitude` as text, e.g. `40.712776`,
`-74.005974`.

### Odd but true

- **The instructions say "DMS format"** (degrees, minutes, seconds), but the fields only accept
  **decimal** numbers like `40.712776`. A DMS value such as `40°42'46"N` is refused with
  "Coordinates Needed".
- The phone's location permission is asked for **only here**, the first time Detect Location is
  tapped.

## Rename a sensor

- Top bar (☰, logo, spacer). **←**, a satellite-dish icon, **"Rename Sensor"** in amber.
- "Enter Your Sensor Name." and a **Sensor Name** field filled with the current name.
- **Submit** (blue): saves (`PATCH /sensors/{sensorId}/` with `name`), **waits for the server**,
  updates the name on screen, then returns to Sensor details.
- **←** or Back: Sensor details without saving.
- If saving fails, nothing is shown (Q27). Empty names are not checked.

## About this sensor

- Top bar with **X**. **←**.
- A large picture of the sensor. This is **always** the black round sensor, even for the onboard
  probe (Q17).
- The **sensor name** (large).
- "Paired to Hub: " and the hub's name.
- "Date Paired" and the date and time the sensor connected, e.g. "10-06-2026 03:07 PM".
  **Not converted to the phone's time zone**: the clock time is shown exactly as the server's
  timestamp gives it (for a UTC timestamp, UTC). Event history, by contrast, does convert to local
  time (Q43).
- **X**, **←** or Back → Sensor details.
- When opened, the app re-reads both the hub and the sensor in the background
  (`POST /devices/{id}/message/get_health/`, `GET /devices/{id}/`, `GET /sensors/{id}/`).

## Delete a sensor

1. Sensor details → ⋮ → **Delete Sensor** (red). The menu closes.
2. Popup **"Delete Sensor?"** / "Are you sure you want to delete this Sensor?" with **Cancel** and
   **Delete**.
3. **Delete** → `DELETE /sensors/{sensorId}/` → the popup closes and the **Sensors list** opens.
4. If the server refuses, the popup stays open with no message (Q27). If the session check fails
   before sending, the app behaves **as if the delete worked** and returns to the Sensors list, but
   the sensor has not been deleted.

## Related

- [18 Sensor details](18-sensor-details.md) · [16 Sensors list](16-sensors-list.md) ·
  [32 Location permission](32-permissions-and-platform-behaviour.md)
