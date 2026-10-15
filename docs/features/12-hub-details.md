# 12 — Hub Details

## In short

Tapping a hub opens its control centre. It shows the hub's name and a large status picture
(connected, disconnected, or still checking), and six action buttons: **History**, **Open Gate**,
**Sensors**, **Firmware Updates**, **Connect HUB** and **Hub Settings**. A ⋮ menu offers Rename,
About, Check for updates and Delete. The screen appears instantly from what the app already knows,
then confirms the hub's live status with the server.

| | |
|---|---|
| **Who** | Every user with a hub |
| **Where** | Hubs list → tap a hub; "Pair to Wi-Fi Later"; back from any hub sub-screen |
| **Flutter source** | `screens/devices/device_view.dart`, `components/hub_status_glyph.dart`, `components/three_button_rows/icon_button_row_entry.dart`, `bloc/devices/events/go_to_specific_device_event.dart`, `bloc/shared/bloc.dart` (`emitThenRefresh`) |
| **Detailed spec** | `docs/spec/10-hubs.md` §3 · `07-design-system.md` §10 (HubStatusGlyph) |
| **Porting plan** | Phase 9 (9.3) |

## What the user sees

- **Top bar**: ☰, logo, **⋮** menu.
- **←** arrow (back to the Hubs list).
- The **hub name** (large).
- **Flagged warning**, only if the hub is blacklisted: a pink box with a red border reading "This
  hub has been flagged for suspicious activity. Please contact support to re-activate this hub".
  It has no button.
- **Status picture**: a large broadcast-tower icon with a small ✓ or ✗ badge, and a status line:

  | Situation | Icon colour | Badge | Text |
  |---|---|---|---|
  | Still checking with the server | light grey | none | "Status: Checking..." (grey) |
  | Connected | amber | ✓ | "Status: Connected" |
  | Disconnected | dark grey | ✗ | "Status: Disconnected" |
  | Check failed, last known connected | amber | ✓ | "Status: Last known connected" |
  | Check failed, last known disconnected | dark grey | ✗ | "Status: Last known disconnected" |

- **Six buttons** in two columns (blue icons with white labels; dark grey when disabled):

  | Button | Enabled when | Does |
  |---|---|---|
  | **History** | always | Opens this hub's event history ([21](21-event-history.md)) |
  | **Open Gate** | "Integrator support" is on in Hub settings **and** the hub is connected | Tells the hub to trigger the connected gate/integrator. Shows the toast "Sent message to open gate" straight away. |
  | **Sensors** | always | Opens the Sensors list ([16](16-sensors-list.md)). A small red dot shows on it if any sensor is flagged. |
  | **Firmware Updates** | always | Opens [15 Firmware updates](15-firmware-updates.md) |
  | **Connect HUB** | the hub is **disconnected** | Starts [11 Wi-Fi pairing](11-connect-hub-to-wifi.md) |
  | **Hub Settings** | always | Opens [13 Hub settings](13-hub-settings.md) |

- A thin divider and "Last Updated: 10-06-2026 03:07 PM" (when this screen last refreshed).

On wide screens the buttons get wider side margins.

## The ⋮ menu

| Item | Does |
|---|---|
| ✏ **Rename Hub** | Opens the rename form ([14](14-rename-about-and-delete-a-hub.md)) |
| ⓘ **About** | Opens "About hub" ([14](14-rename-about-and-delete-a-hub.md)) |
| ☁ **Check for updates** | Opens [15 Firmware updates](15-firmware-updates.md) |
| ⊗ **Delete Hub** (red) | Asks to confirm, then deletes the hub ([14](14-rename-about-and-delete-a-hub.md)) |

## What happens when...

| Event | Result |
|---|---|
| The screen opens | Shown at once with "Status: Checking...". In the background the app asks the server to request a health report from the hub, then reloads the hub. The status updates to Connected/Disconnected. If that fails, it shows "Last known ...". |
| The user pulls down | After 2 s the hub is reloaded, and "Last Updated" changes to now. Errors are ignored silently. |
| The user taps a disabled button | Nothing |
| ← or Android Back | Hubs list |

## What the app asks of the server

| When | Request | Expects |
|---|---|---|
| Opening, pull-to-refresh | `POST /devices/{id}/message/get_health/` then `GET /devices/{id}/` | the hub record (see [09](09-hubs-list.md) for fields) |
| **Open Gate** | `POST /devices/{id}/message/trigger_integrator/` (empty body) | below 300 (a failure is reported to Sentry, code `7466e`, and never shown) |

"message/..." requests ask the server to forward a command to the hub over the hub's own live
connection. The phone never talks to the hub directly, except during Wi-Fi pairing.

## Odd but true

- **Q39**: **Open Gate** shows its success toast *before* the server has answered. A failure is
  never shown.
- **Q19**: whether Open Gate is enabled depends on a flag ("integrator support") that is **not
  updated** when the hub is reloaded during the session. If it is changed elsewhere (another
  phone, the Alexa skill), this phone only sees the change after the app restarts. Changing it on
  this phone's Hub settings screen does update it.
- **"Connect HUB" is disabled when the hub is connected.** The pairing wizard cannot be started for
  a hub the server currently shows as online. "Hub Added to Account!" is the only other way in.
- **"Last Updated"** records when the screen was refreshed, not when the hub last reported.

## Related

- [09 Hubs list](09-hubs-list.md) · [13 Hub settings](13-hub-settings.md) ·
  [14 Rename / About / Delete](14-rename-about-and-delete-a-hub.md) · [16 Sensors](16-sensors-list.md)
