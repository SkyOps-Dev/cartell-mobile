# 09 — Hubs List (Home Screen)

## In short

The home screen. It lists every hub on the account as a large card showing the hub's name, a
picture and whether it is **Connected** or **Disconnected**. From here the user opens a hub or adds
a new one. It is the first screen after sign-in and the screen most actions return to.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Where** | After sign-in; menu → **HUBs**; Back / ← from Hub details; after deleting a hub; after finishing pairing |
| **Flutter source** | `screens/devices/devices_screen.dart`, `bloc/devices/events/go_to_devices_home_screen.dart`, `bloc/devices/events/refresh_devices_event.dart`, `components/ellipsis.dart`, `components/reusable_card.dart` |
| **Detailed spec** | `docs/spec/10-hubs.md` §2 · `06-state-and-navigation.md` §5 |
| **Porting plan** | Phase 9 (9.2) |

## What the user sees

- **Top bar**: ☰ menu on the left, logo, and a **⋮** menu on the right with one item, **"Add Hub"**.
- **Heading**: "Hubs" (large, bold, letter-spaced, in the Source Sans Pro font), and under it
  "View existing HUBs or add a HUB".
- **No hubs yet**: a dark card saying "No Hubs have been added.", a large satellite-dish icon, and
  "Press the plus button below to get started."
- **One or more hubs**: a single column of square cards, at most 300 px wide (unless the phone's
  text is set large), one per hub, in the order the server returns them. Each card shows:
  1. the **hub name** (scrolls sideways if too long)
  2. a **picture of the hub**, or, if the hub is **blacklisted**, a large orange warning triangle
     instead
  3. a broadcast-tower icon, **amber** when connected and **dark grey** when not, followed by
     "Status: Connected", "Status: Disconnected" or "Status: Blacklisted"
  4. a **red circle badge** (about 40 px) on the top-right corner of the card if any sensor on
     the hub has been flagged (blacklisted)
- A round **amber + button** at the bottom-right corner.

## What happens when...

| The user... | What happens |
|---|---|
| taps a hub card | Opens [12 Hub details](12-hub-details.md) for that hub |
| taps **+** or ⋮ → **Add Hub** | Opens [10 Add a hub](10-add-a-hub.md) |
| pulls down | Amber refresh animation; after 2 seconds the list reloads in place (no loading screen) |
| presses Android **Back** | Popup "Leave App" / "Are you sure you want to leave this app?" → **Nevermind** / **Leave** |
| opens the screen | See "Every time the screen opens" below |

### Every time the screen opens

1. If the app already has a hub list from earlier, it is shown **immediately**, then refreshed in
   the background. On the very first opening there is nothing to show, so the Loading screen
   appears until the list arrives.
2. The app asks for **notification permission** (if not granted yet) and **re-registers this
   phone's push token** with the server. This happens on *every* visit (Q23).
3. If the user has already tapped into a hub by the time the refresh arrives, the refresh does not
   pull them back.

The cards also update by themselves whenever any other screen downloads newer data about a hub,
because all screens share one in-memory copy of each hub.

## What the app asks of the server

| When | Request | Expects |
|---|---|---|
| Screen opens, pull-to-refresh | `GET /devices/` | A list of hubs. For each: `id`, `name`, `location`, `latitude`, `longitude`, `archived`, `added_date`, `should_use_onboard_sensor`, `should_send_notification`, `should_send_connection_notification`, `should_send_email`, `should_use_emulated_sensor`, and a nested `device` with `is_connected`, `mac_address`, `esp32_app_version`, `rfm6601_app_version`, `is_blacklisted`, `device_model`, `connections`, and `sensors` (each with `is_blacklisted`) |
| Screen opens | `POST /notifications/register_device/` | `token`, `device_name`, `platform` (see [20](20-notifications.md)) |

## When something goes wrong

| Situation | Result |
|---|---|
| The hub list cannot be loaded | No message. The app re-checks the session; if the session is dead it goes to the Welcome screen. Otherwise it retries after 1, 2 and 3 seconds, then gives up and leaves whatever was on screen. See [06](06-session-and-log-out.md). |
| Pull-to-refresh fails | Same as above |
| Server down / unreachable | The maintenance screen takes over (see [07](07-maintenance-and-no-connection.md)) |

## Odd but true

- **Q23**: every visit to this screen sends the push token to the server again and re-checks
  notification permission.
- **The hub picture is a 4.2 MB image** drawn for every card. The copy keeps the same asset unless
  the client approves a lighter one.
- **"Blacklisted"** is the word shown on the card. On the hub's own screen the same condition is
  described as "flagged for suspicious activity" (see [12](12-hub-details.md)).
- **"HUBs" and "Hubs"** are both used on this one screen.

## Related

- [10 Add a hub](10-add-a-hub.md) · [12 Hub details](12-hub-details.md) ·
  [08 Navigation](08-navigation-and-screen-layout.md) · [20 Notifications](20-notifications.md)
