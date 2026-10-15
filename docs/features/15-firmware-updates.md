# 15 — Firmware Updates

## In short

A hub runs two pieces of software (firmware): one on its **controller** chip and one on its
**transmitter** (radio) chip. The Firmware screen shows the versions the hub runs, compares them
with the newest versions on the server, and offers **Update now** for any that are out of date.
During an update a big progress ring shows the percentage, time elapsed and time remaining. The
update happens on the hub, over the internet, and keeps running if the user leaves the screen.

| | |
|---|---|
| **Who** | Hub owners |
| **Where** | Hub details → **Firmware Updates**, or ⋮ → **Check for updates** |
| **Flutter source** | `screens/devices/firmware_update/*` (overview screen, progress screen, update listener, status codes, progress snapshot), `bloc/devices/events/go_to_device_firmware_updates_event.dart`, `go_to_update_device_firmware_screen.dart`, `services/requests/firmware_requests.dart`, `firmware_update_requests.dart`, `device_requests.dart` |
| **Detailed spec** | `docs/spec/14-firmware.md` |
| **Porting plan** | Phase 13 |

## The Firmware screen

### Opening it

The Loading screen shows while the app fetches four things **at the same time**: the hub, the
newest controller firmware, the newest transmitter firmware, and any update already running on
this hub. A component counts as "out of date" when its version number is **lower** than the
newest one.

### What the user sees

- Top bar (☰, logo). **←** ("Back to hub") and the **hub name** in large text.
- **"Current firmware"** card:
  - two small cards side by side (stacked if the text size is large):
    **Controller** (blue chip icon) and **Transmitter** (amber tower icon), each showing "v"
    and the version number (for example "v1025"). If the hub has not reported a version: "Not
    reported".
  - connection line: amber "HUB connected", or red "HUB offline — versions shown are the last we
    heard".
- Then **one** of three panels:

**A. An update is already running**: "Update in progress" / "Controller firmware is updating to
v1030. Keep the hub powered on." (or "Transmitter") and **View progress** (amber) → the progress
screen, watching that update.

**B. Updates available**: "1 update available" / "2 updates available", then one card per
component (controller first):

- "Controller firmware" or "Transmitter firmware", and "v1025 → v1030" (current → new; "?" if
  unknown)
- **Update now** (blue for controller, amber for transmitter). It is grey and disabled while the
  hub is offline, with "Reconnect the hub before updating." underneath.
- Tapping it asks: **"Update this hub?"** / "This takes a few minutes. Keep the hub powered on and
  on WiFi. You can leave this screen while it runs, and the hub keeps its current firmware if the
  update fails." with **Not now** and **Update**.

**C. Up to date**: green ✓, "Firmware is up to date", and "Both components are running the latest
versions." (connected) or "Both components were on the latest versions when the hub last checked
in." (offline).

**←** or Android Back return to Hub details.

## The progress screen

No menu on this screen. Content:

1. **←** ("Back to firmware").
2. A **progress ring** (amber on dark grey, 200–300 px across) with the percentage in the middle.
   The number animates smoothly to each new value over 0.8 s, or jumps if the phone's "reduce
   motion" setting is on. It becomes a large green ✓ on success or a red ✗ on failure.
3. Headline and explanation:

   | Stage | Headline | Explanation |
   |---|---|---|
   | Starting | "Starting update" | "Keep the hub powered on." |
   | Running | "Updating firmware" | "Keep the hub powered on. You can leave this screen — the update keeps running." |
   | Done | "Update complete" | "Your hub is now running v1030 and is back to watching for vehicles." |
   | Failed | "Update did not finish" | "Your hub kept its previous firmware and is still working. Check that it is powered on and connected, then try again." |

4. While running: **Elapsed** (mm:ss, or hh:mm:ss) and **Remaining** (estimated), each
   "Calculating..." until there is enough data.
5. **Version** "v1030".
6. On failure: **Try again** (amber) and "Reference: <number>" in grey.

Screen readers announce the headline when the update ends, and "Firmware update 40 percent
complete" each time another 10% is reached.

### What happens behind the screen

1. If the user tapped **Update now**, the app asks the server to start the update and gets back an
   **update id**. If they tapped **View progress**, it uses the existing update's id and does not
   start a second one.
2. Every **1 second** the app asks the server for that update's status:
   - **PENDING** → "Starting update" (the hub has not started downloading)
   - **RUNNING** → percentage = bytes sent ÷ file size; the percentage never goes backwards
   - **SUCCEEDED** → 100%, ✓, and the app records the new version on the hub
   - **FAILED** → ✗
   - anything else → treated as failed, and reported to Sentry
3. The time remaining is estimated from the progress so far.
4. A single failed status check is ignored. After **5 failed checks in a row** the app stops
   watching and shows the "Lost contact" message (below).
5. Leaving the screen (←, Back) stops the watching, not the update. Coming back with **View
   progress** picks it up again.

### Leaving after a successful update

← or Back after success first runs the "Give Feedback" prompt (which normally does not appear, see
[26](26-feedback.md)), then returns to the Firmware screen.

## What the app asks of the server

| When | Request | Sends | Expects |
|---|---|---|---|
| Opening Firmware | `GET /devices/{id}/` (after `POST .../message/get_health/`) | | hub record with `esp32_app_version`, `rfm6601_app_version`, `is_connected` |
| | `GET /latest-esp32-app/` | | a list; the first item is the newest controller firmware: `id`, `version_number`, `release_date`, `stable`, `supported`, `processor` |
| | `GET /latest-rfm6601-app/` | | same, for the transmitter |
| | `GET /devices/{id}/check_existing_firmware_update/` | | 200 or 202 with a list of running updates (first one used) |
| **Update** | `POST /devices/{id}/message/update_firmware/` | `firmware` = firmware id | below 300 with `fw_update_id`; otherwise `non_field_errors` explaining the refusal |
| Every second | `GET /firmware_update/{updateId}` (no trailing slash) | | `status` (PENDING/RUNNING/FAILED/SUCCEEDED), `file_size`, `file_cursor`, `date_started`, `firmware` |

## When something goes wrong

Failures while starting or watching open a dark dialog with an amber **OK** that returns to the
Firmware screen:

| Situation | Title | Message |
|---|---|---|
| The server refuses to start (for example, an update is already running) | "Cannot start update" | the server's explanation, word for word |
| The session expired just before starting | "Sign in again" | "Your session expired before the update could start. Your hub is untouched. Sign in again and retry." |
| Anything else, including 5 failed checks in a row | "Lost contact" | "We lost contact with the hub while watching the update. The update may still be running. Check that the hub is powered on and connected, then open Firmware again to see where it got to." |

If the Firmware screen itself cannot load, the app returns to the Hubs list (see [06](06-session-and-log-out.md)).

## Odd but true

- **Q31**: if the hub has never reported a version for either chip, opening the Firmware screen
  fails and the user is sent back to the Hubs list. The cards on the screen *can* show "Not
  reported", but the comparison runs first and fails before they are shown.
- The "Update" confirmation says "on WiFi", while other screens say "Wi-Fi".
- An unused set of 12 detailed failure codes (for example "Failure! Code: 2f088a11") exists in the
  code. Only four statuses can ever appear. See [A4](A4-hidden-and-unused-features.md).
- An earlier plan to stream progress over a WebSocket was abandoned; progress is checked once a
  second over normal requests.

## Related

- [12 Hub details](12-hub-details.md) · [14 About hub](14-rename-about-and-delete-a-hub.md) ·
  [26 Feedback](26-feedback.md)
