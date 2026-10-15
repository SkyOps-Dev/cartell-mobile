# 08 — Navigation Menu, Screen Layout and the Back Button

## In short

Once signed in, every main screen has the same frame: a dark top bar with the Cartell logo in the
middle and a **side menu** behind a ☰ button. The menu has five entries: Account Settings, Event
History, HUBs, Help and Log Out. On tablets and other wide screens the menu stays open on the left
instead. Inside hub and sensor screens, users move with on-screen **←** arrows and **X** buttons.
The Android **Back** button follows the same rules screen by screen (table below).

| | |
|---|---|
| **Who** | Every signed-in user |
| **Flutter source** | `components/app_scaffold.dart`, `components/navbar.dart`, `components/ellipsis.dart`, `components/timed_pull_to_refresh.dart`, `screens/bloc_widgets/*.dart`, `bloc/shared/bloc.dart` |
| **Detailed spec** | `docs/spec/06-state-and-navigation.md` (whole) · `07-design-system.md` §9 · `10-hubs.md` §1 · `18-cross-cutting.md` §2 |
| **Porting plan** | Phase 5 (5.x), Phase 6, Phase 9 (9.1) |

## The screen frame

### Top bar

- Dark grey (`#25282A`) with the white **Cartell logo** in the centre.
- **Left**: the ☰ menu button, on phones and narrow windows. It is not shown on wide screens, or
  on screens where the menu is deliberately hidden (below).
- **Right**: depends on the screen. One of a **⋮** menu (three dots), an **X** close button, or
  nothing. Some screens add an invisible spacer here, so the logo is not exactly centred on every
  screen. The React Native copy matches each screen.

### The side menu (drawer)

Opened by tapping ☰ or swiping in from the left edge. Closed by tapping outside it, swiping it
away, or pressing Back. Grey background:

1. **Header**: round profile picture (a generic avatar, the same for everyone), the user's
   **first and last name**, and their **email**. The email is hidden when the phone's text size is
   set very large.
2. Menu items, each with an icon, separated by thin lines:

| Item | Icon | Goes to |
|---|---|---|
| **Account Settings** | person | [22 Account settings](22-account-settings.md) |
| **Event History** | clock with arrow | [21 Event history](21-event-history.md) (all hubs) |
| **HUBs** | satellite dish | [09 Hubs list](09-hubs-list.md) |
| **Help** | headset | [25 Help](25-help-screen.md) |
| **Log Out** | door with arrow | the Log Out confirmation, see [06](06-session-and-log-out.md) |

Tapping an item closes the menu first, then opens the destination. Tapping **HUBs** while already
inside a hub or sensor screen returns to the Hubs list.

If the user's details could not be loaded, the menu shows only the text "Unable to get current
user. Please restart the app and try again."

### Wide screens (tablets, landscape on large phones)

When the window is **wider than 800 px**, the menu is drawn permanently on the left side of every
main screen (a "rail"), there is no ☰ button, and screen content sits to its right. Several screens
also add wider side margins above 500 px.

### Screens without the menu

The menu (and ☰) is deliberately absent from: the hub pairing wizard (leaving mid-way would strand
the hardware), the firmware progress screen, the "Hub Added" screen, and the signed-out screens
(Loading, Welcome, Login, Registration, Lock, Maintenance).

## Moving between screens

- Screens **cross-fade over 300 ms**. There are no slide-in transitions, except for the QR code
  scanner, which slides in like a normal pushed page.
- Pairing wizard steps change **instantly**, with no animation between steps.
- A screen that refreshes in place (for example after pull-to-refresh) updates without any
  transition.
- Many lists support **pull-to-refresh**: drag down and an amber "liquid drop" animation appears;
  after a fixed **2-second** pause the data reloads. Available on the Hubs list, Hub details,
  Sensors list, Sensor details and the three Event History lists.

## The Back button (Android) and back arrows

Most screens have an **←** arrow near the top-left of the content, and some have an **X** in the
top bar. Android's system Back button does what the table says:

| Screen | Android Back does |
|---|---|
| Loading, Welcome, Login, Registration, Lock, Maintenance | Closes the app (moves it to the background) |
| **Hubs list** | Popup **"Leave App"** / "Are you sure you want to leave this app?" with **Nevermind** and **Leave**. **Leave** closes the app on Android; on iOS it does nothing. |
| Account Settings | Hubs list |
| Edit name, Edit phone | Account Settings |
| Edit password | Account Settings (ignored while a change is being saved) |
| Help | Hubs list (note: the **X** on Help goes back one screen instead, Q29) |
| Alexa guide, Hub light guide | **Nothing** (Q28); use the on-screen ← or X |
| All event history | Hubs list |
| Hub details | Hubs list |
| Hub settings, About hub, Rename hub, Hub history, Sensors list, Firmware updates | Hub details |
| Firmware progress | Leaves the progress screen (see [15](15-firmware-updates.md)) |
| Sensor details | Sensors list |
| About sensor, Rename sensor, Edit coordinates, Sensor history | Sensor details |
| Add-sensor steps 1–3 | Sensors list (step 3 does not switch off the hub's pairing mode, Q11) |
| Add hub | Hubs list |
| Hub Added | Hub details |
| Pairing wizard | Early steps: Hubs list. Mid-pairing: asks **"Stop Pairing?"** first. See [11](11-connect-hub-to-wifi.md). |
| Any loading screen inside the app | Nothing |
| A popup | Closes it (Android allows this even though tapping outside does not) |
| A bottom panel (Debug Info, Feedback) | Closes it |
| QR scanner | Closes the scanner |

**iOS** has no system Back button. The edge-swipe "back" gesture only works on the QR scanner;
every other screen relies on the on-screen arrows and X buttons.

## How navigation works inside (for the React Native team)

The app does not use a normal page stack. Each area has a state machine, and the screen on show
is chosen from the current state. There are three nested machines: signed-in/signed-out, the main
app (account, history, help), and the hubs area. Each keeps a small history of recent states for
the few "go back one" actions (the Help **X** and the Alexa and Hub-light **← / X**). Every other
back action jumps to a named screen, as the table shows. Details: `docs/spec/06-state-and-navigation.md`.

## Odd but true

- **Q28**: Back does nothing on the Alexa guide and the Hub light guide.
- **Q29**: on Help, the **X** and the **←** / Back can lead to different places. X returns to the
  previous screen; ← and Back always go to the Hubs list.
- **The logo is not always centred**, because each screen puts something different on the right
  of the top bar.
- **"Leave" does nothing on iOS**, because iOS apps are not allowed to close themselves.

## Related

- [09 Hubs list](09-hubs-list.md) · [30 Popups and toasts](30-popups-toasts-and-banners.md) ·
  [32 Platform behaviour](32-permissions-and-platform-behaviour.md) · [A3 Screen index](A3-screen-index.md)
