# 21 — Event History

## In short

A scrolling list of everything that has happened: **vehicle detections**, and **connections and
disconnections** of hubs and sensors. It comes in three versions: everything on the account, one
hub, or one sensor. The newest entries load first and more load as the user scrolls down. This is
where someone goes after an alert to see what happened and when.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Where** | Menu → **Event History** (all); Hub details → **History** (one hub); Sensor details → **View History** (one sensor) |
| **Flutter source** | `screens/events/history.dart` (also `HistoryCard`), `screens/events/device_history.dart`, `screens/events/sensor_history.dart`, `screens/events/phone_rotation_manager.dart`, `services/requests/event_requests.dart`, `models/event.dart`, `bloc/main_app/events/go_to_event_history_screen.dart`, `bloc/devices/events/go_to_specific_device_history_event.dart`, `go_to_sensor_history_event.dart` |
| **Detailed spec** | `docs/spec/12-event-history.md` · `05-models-and-cache.md` §3 (Event, Results, EventType) |
| **Porting plan** | Phase 11 |

## What the user sees

The three screens share the same list. They differ only in the heading:

| Version | Top bar right | Heading |
|---|---|---|
| All | spacer | **←**, "All Event History" (bold), a white divider |
| One hub | **X** | **←**, the hub name (bold), "Hub's Event History", divider |
| One sensor | **X** | **←**, the sensor name (bold), "Sensor's Event History", divider |

Each **event card**:

- an amber icon on the left: a **car** for a detection, a **house with ✓** for a connection, a
  **house with ✗** for a disconnection
- the **sensor name**, or the hub name if the event has no sensor
- the **event type** in **red**: "Motion Detected", "Connected" or "Disconnected" (red for all
  three, Q5)
- the **date and time** in the phone's time zone, e.g. "10-06-2026 3:07:45 PM"
- if the event came from a sensor, a small grey line "Connected to <hub name>"

When the phone's text is set very large, the icon moves above the text instead of beside it. On
wide screens (over 500 px) the cards are centred.

At the bottom of the list, while more pages exist, a blue spinner shows. Scrolling to the very
bottom loads the next page and adds it to the list.

While the first page loads, the heading is shown and a spinner fills the list area.

There is no "no events yet" message; an empty history is just an empty list.

The screen may rotate to landscape (all orientations are allowed here, as everywhere in the app).

## What happens when...

| The user... | All history | Hub history | Sensor history |
|---|---|---|---|
| opens it | Heading appears at once, list loads | same | same (the sensor is also re-read) |
| scrolls to the bottom | loads the next page | same | same |
| pulls down | after 2 s, the **whole screen** turns into a plain loading spinner, then the list reloads from the first page; the hubs list is also re-downloaded in the background | the list area shows a spinner, then reloads | the list empties and refills, with no spinner |
| taps **←** / Back | Hubs list | Hub details | Sensor details |
| taps **X** | (none) | Hub details | Sensor details |

Event cards cannot be tapped.

## How the date is written

Times are converted to the phone's time zone and written as **month-day-year**, then the time with
seconds and AM/PM:

| Time of day | Shown as |
|---|---|
| 00:xx | "12:mm:ss AM" |
| 01:00–11:59 | "**0**9:05:03 AM" (two-digit hour) |
| 12:xx | "12:mm:ss PM" |
| 13:00–23:59 | "**1**:05:03 PM" (hour **not** padded) |

So morning hours have a leading zero and afternoon hours do not. This is how it is built.

## What the app asks of the server

| Version | First page | Later pages |
|---|---|---|
| All | `GET /activations` (no trailing slash) | the `next` link from the previous page |
| One hub | `GET /devices/{id}/activations` | `next` |
| One sensor | `GET /sensors/{id}/activations/` (plus `GET /sensors/{id}/` on opening) | `next` |

Each page is a JSON object with `count`, `next`, `previous` and `results`. Each result has `id`,
`device`, `device_name`, `sensor`, `sensor_name`, `event_type`, `time`, `location` and `added_date`.

`event_type` codes: **AC** = "Motion Detected", **CO** = "Connected", **DC** = "Disconnected".
Anything else (including the old code `PS`) is shown as "Motion Detected".

Before following a `next` link, the app rewrites it to `https://` (or `http://` on a non-HTTPS
developer server), in case the server produced the wrong scheme.

## When something goes wrong

| Situation | Result |
|---|---|
| The first page cannot be loaded | The app leaves the screen: back to the Hubs list, or to the Welcome screen if the session is dead (see [06](06-session-and-log-out.md)) |
| Hub history: refreshing or loading more fails | A large orange warning triangle and the **raw technical error text** replace the list (Q25). Usually this is literally "Instance of 'UnableToUpdateExceptions'"; after a timeout it is "The request timed out. Check your internet connection and try again." |
| All history: refreshing fails | The list is left empty; the error goes to Sentry |
| Sensor history: refreshing fails | The list is left empty; the error goes to Sentry |

## Odd but true

- **Q5**: every event type is shown in red, including "Connected".
- **Q24**: pull-to-refresh on All history also re-downloads the hubs list, and hides everything
  behind a loading screen while it works.
- **Q25**: hub history can show raw technical error text.
- **Paging only triggers on scrolling.** If the first page does not fill the screen, the user
  cannot scroll, so the next page never loads, although the spinner at the bottom still shows.
- **"View History" for a sensor uses a router icon**, not a clock.

## Related

- [12 Hub details](12-hub-details.md) · [18 Sensor details](18-sensor-details.md) ·
  [20 Notifications](20-notifications.md)
