# 18 — Sensor Details

## In short

One sensor's screen: its name and picture, battery status, a button to find it on a map (or set
its location), its history, its info, and a switch to turn its alerts on or off. For the hub's
built-in (onboard) sensor there is also a **Pair Sounder** button. If the server has flagged the
sensor, a warning with a **Contact Support** button appears at the top.

| | |
|---|---|
| **Who** | Hub owners |
| **Where** | Sensors list → tap a sensor; back from the sensor's sub-screens |
| **Flutter source** | `screens/sensors/sensor_view.dart`, `screens/sensors/sensor_flagged_banner.dart`, `components/three_button_rows/*`, `components/teast_popups.dart`, `bloc/devices/events/go_to_specific_sensor_screen.dart` |
| **Detailed spec** | `docs/spec/13-sensors.md` §3 |
| **Porting plan** | Phase 12 (12.2) |

## What the user sees

- **Top bar**: ☰, logo, **⋮** (Rename Sensor, Edit Coordinates, About, Delete Sensor; see [19](19-sensor-location-rename-about-delete.md)).
- **←** (back to the Sensors list).
- **Flagged warning** (only if blacklisted): a pink box with a red border, "This sensor has been
  flagged for suspicious activity. Please contact support to re-activate this sensor", and an amber
  **Contact Support** button that opens the Help screen ([25](25-help-screen.md)).
- The **sensor name** (large).
- The **picture**: the black round sensor box, or the white probe for the onboard sensor.
- **Battery** (not shown for the onboard sensor):
  - while the sensor is being re-read: no icon, "Battery Status: Checking..." in grey
  - low: red empty-battery icon, "Battery Status: Low"
  - fine: green full-battery icon, "Battery Status: Good"
- **Three buttons** in a row (stacked if the text size is large):

  | Button | Does |
  |---|---|
  | **Find Sensor** (when the sensor has coordinates) | Opens the phone's maps app at the sensor's coordinates, labelled with the sensor's name |
  | **Set Location** (when it has none) | Opens the coordinates editor ([19](19-sensor-location-rename-about-delete.md)) |
  | **View History** | This sensor's events ([21](21-event-history.md)) |
  | **About** | When the sensor was paired ([19](19-sensor-location-rename-about-delete.md)) |

- A divider, then **"Receive Sensor Notifications:"** with a switch.
- **Pair Sounder** (amber, onboard sensor only).
- "Last Updated: <date time>" (when this screen last refreshed).

## What happens when...

| The user... | What happens |
|---|---|
| opens the screen | Shown immediately with the battery as "Checking..."; the sensor is re-read from the server, then the battery appears |
| pulls down | After 2 s the sensor is re-read and "Last Updated" changes |
| flips **Receive Sensor Notifications** | Switch moves at once and is saved. Toast "Notifications turned on." / "...off.", or on failure the switch flips back with "Notifications failed to turn on." / "...off." |
| taps **Find Sensor** | The maps app opens: **Google Maps (or the default maps app) on Android**, **Apple Maps on iOS**. If the stored coordinates cannot be read as numbers: popup "An error occurred." / "Could not find location. Please make sure you have set a location for this sensor. If the problem persists, please contact support." |
| taps **Pair Sounder** | Tells the hub to pair with a sounder. A grey banner with a ✓ drops from the top: "Sent pairing message successfully". It disappears after 4 seconds and blocks the screen meanwhile. |
| taps **Contact Support** in the flagged warning | Leaves the hub area and opens the Help screen |
| taps **←** or presses Back | Sensors list |

## What the app asks of the server

| When | Request | Sends | Expects |
|---|---|---|---|
| Opening, pull-to-refresh | `GET /sensors/{sensorId}/` | | the sensor (fields in [16](16-sensors-list.md)) |
| Notifications switch | `PATCH /sensors/{sensorId}/` | `should_send_notification` = `"true"`/`"false"` | 200 |
| **Pair Sounder** | `POST /devices/{hubId}/message/pair_to_sounder/` | empty | below 300 |

**Find Sensor** opens a link, not a server request: on Android a `geo:` link with the coordinates
and the name; on iOS `https://maps.apple.com/?ll=<lat>,<lng>&q=<name>`. It opens in the external
maps app, never inside Cartell.

## Odd but true

- **Q39**: Pair Sounder reports success before the server answers; failures are never shown.
- **Pair Sounder uses a different style of message** (a banner that blocks taps for 4 seconds)
  from every other success message (a toast). See [30](30-popups-toasts-and-banners.md).
- **Q19**: the flagged warning does not appear or disappear during a session if the server changes
  the flag after the sensor was first loaded.
- **The onboard sensor has no battery row**, and is the only sensor with **Pair Sounder**.
- **"View History" uses a router icon**, the same icon as the "Sensors" button on Hub details.

## Related

- [16 Sensors list](16-sensors-list.md) · [19 Location, rename, info, delete](19-sensor-location-rename-about-delete.md) ·
  [21 Event history](21-event-history.md) · [20 Notifications](20-notifications.md)
