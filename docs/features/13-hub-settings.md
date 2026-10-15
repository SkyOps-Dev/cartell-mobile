# 13 — Hub Settings

## In short

Five on/off switches that control one hub: use its **built-in sensor**, enable **integrator
support** (for gate openers), and choose which **alerts** this hub sends (detections, connection
changes, emails). Each switch saves the moment it is flipped. If saving fails, the switch flips
back and a message explains why.

| | |
|---|---|
| **Who** | Hub owners |
| **Where** | Hub details → **Hub Settings** |
| **Flutter source** | `screens/devices/device_settings_screen.dart`, `components/forms/auto_switch.dart` (`AutoSwitch`, `SynchronizedAutoSwitch`), `services/requests/device_requests.dart` |
| **Detailed spec** | `docs/spec/10-hubs.md` §4 · `07-design-system.md` §8 |
| **Porting plan** | Phase 9 (9.4) |

## What the user sees

- **Top bar**: ☰, logo, **X** (back to Hub details).
- **←** arrow, the **hub name**, and the same **status picture** as Hub details (checking /
  connected / disconnected / last known), refreshed when the screen opens.
- A scrollbar that is always visible on the right.
- Five rows, each with a label on the left and a switch on the right, separated by thin lines.
  Switches are amber when on.

| Row label | What it controls |
|---|---|
| "Enable Onboard Sensor:" | Whether the hub's built-in sensor is used. The built-in sensor is listed among the hub's sensors with the label "Onboard Sensor" whenever the server includes it. |
| "Enable Integrator Support:" | Whether the hub drives an external device such as a gate opener. When on, a **Pair Integrator** button appears under this row and **Open Gate** becomes available on Hub details. |
| "Receive Hub Notifications:" | Push alerts for detections from this hub |
| "Receive Connection Notifications:" | Push alerts when this hub connects or disconnects |
| "Receive Email Notifications:" | Email alerts for this hub |

## What happens when...

Flipping any switch:

1. The switch moves **immediately**.
2. The app saves the new value on the server.
3. **Saved**: a grey toast with a ✓ drops in from the top for 5 seconds.
4. **Not saved**: the switch **flips back** and a grey toast with a "!" shows the reason.

| Row | Saved toast | Failure toast |
|---|---|---|
| Onboard sensor | "Onboard sensor turned on." / "...off." | If the hub is offline, nothing is sent: "Hub is not connected. Please connect hub and try again." Otherwise: "Error encountered of type: <error name>. Onboard sensor turned off/on. Please try again soon." (names the *previous* state) |
| Integrator support | "Integrator support turned on." / "...off." | "Email notifications failed to turn on." / "...off." (wrong wording, Q7) |
| Hub notifications | "Notifications turned on." / "...off." | "Notifications failed to turn on." / "...off." |
| Connection notifications | "Notifications turned on." / "...off." | "Notifications failed to turn on." / "...off." |
| Email notifications | "Email notifications turned on." / "...off." | "Email notifications failed to turn on." / "...off." |

**Pair Integrator** (only while integrator support is on): a small button with amber text. Tapping
it tells the hub to enter pairing with the integrator, and shows the toast "Sent pairing message
successfully" straight away.

**X**, **←** or Android Back return to Hub details.

## What the app asks of the server

All five switches update the hub record with one field each, sent as text `"true"` or `"false"`:

| Switch | Request | Field |
|---|---|---|
| Onboard sensor | `PATCH /devices/{id}/` (**without** the session check first) | `should_use_onboard_sensor` |
| Integrator support | `PATCH /devices/{id}/` | `should_use_emulated_sensor` |
| Hub notifications | `PATCH /devices/{id}/` | `should_send_notification` |
| Connection notifications | `PATCH /devices/{id}/` | `should_send_connection_notification` |
| Email notifications | `PATCH /devices/{id}/` | `should_send_email` |
| **Pair Integrator** button | `POST /devices/{id}/message/pair_to_integrator/` (empty) | — |

Success means status **200** for the switches (below 300 for Pair Integrator). Opening the screen
also sends `POST /devices/{id}/message/get_health/` and `GET /devices/{id}/`.

## Odd but true

- **Q7**: the integrator switch's failure message talks about "Email notifications".
- **Q39**: "Pair Integrator" reports success before the server answers, and never reports failure.
- **The onboard-sensor switch refuses to change while the hub is offline**, but the other four do
  not check.
- **Q19**: the integrator switch reads a value that is not refreshed during the session (see
  [12](12-hub-details.md)).
- The onboard-sensor failure text names the state the switch has gone back to, so tapping "on" and
  failing says "...Onboard sensor turned off...".
- The account-wide notification switches are separate and live in [Account settings](22-account-settings.md).
  Sensors have their own switch too ([18](18-sensor-details.md)).

## Related

- [12 Hub details](12-hub-details.md) · [20 Notifications](20-notifications.md) ·
  [30 Toasts](30-popups-toasts-and-banners.md)
