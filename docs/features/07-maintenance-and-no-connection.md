# 07 — Server Maintenance and "Can't Reach Cartell"

## In short

If the Cartell server is down for an update, or the phone cannot reach it at all, the app replaces
**whatever is on screen** with a full-screen notice and a **Retry** button. There are two versions:
a wrench for "the server is being updated" and a Wi-Fi symbol for "we can't reach Cartell". When
the server comes back, the app signs the user in again on its own and returns to the Hubs list.

A related protection: if the phone is still connected to a **hub's own setup Wi-Fi** (named
"Cartell Hub ..."), the app refuses to make server requests, because none of them could work.

| | |
|---|---|
| **Who** | Anyone, at any time the app is on screen |
| **Flutter source** | `screens/welcome/maintenance_mode_screen.dart`, `services/requests/networking.dart` (`validateServerMode`), `utilities/AppWatchers/mode_watcher.dart`, `utilities/AppWatchers/mode_debouncer.dart`, `screens/bloc_widgets/auth_bloc_widget.dart`, `services/requests/hub_network_name_check.dart` |
| **Detailed spec** | `docs/spec/04-networking-and-api.md` §1, §2, §6 · `08-auth-and-session.md` §7 |
| **Porting plan** | Phase 4 (4.8, 4.9), Phase 7 (7.7) |

## How the app decides the server's state

Before **every** server request, and every 15 seconds from the background timer, the app asks the
server `GET /maintenance-mode/` (15-second time limit, no sign-in header):

| Answer | Mode |
|---|---|
| 200 | **Normal** |
| Any other status (the server answered, but not with 200) | **Maintenance** |
| No answer: timeout, no internet, unknown server name | **Unreachable** |

This check is skipped, and the mode is taken as Normal, when:

- the app is **not on screen** (in the background, or the phone is locked), or
- **hub pairing is in progress**, when the phone is deliberately off the internet (see
  [11](11-connect-hub-to-wifi.md)), or
- the phone is connected to a hub's own Wi-Fi.

## Avoiding flicker

A flaky connection can alternate between "maintenance" and "unreachable" on every check. The app
smooths this out:

- Going from normal into either problem mode, or back to normal: shown **immediately**.
- Switching between the two problem modes: only after **two checks in a row** agree.
- The same mode again: nothing changes.

## What the user sees

The screen keeps the dark top bar with the Cartell logo (no menu). In the centre:

| | Maintenance | Unreachable |
|---|---|---|
| Icon (large) | wrench | Wi-Fi symbol |
| Text | "The server is currently undergoing an update. Please check back later." | "We can't reach Cartell right now." (new line) "Check your internet connection and try again." |
| Button | **Retry** (plain text button, in the default lavender colour) | same |

**Retry** checks the server again straight away (instead of waiting up to 15 seconds), and is
greyed out while that check runs.

Android **Back** on this screen closes the app.

## What happens when...

| Event | Result |
|---|---|
| The server goes into maintenance or becomes unreachable while the user is anywhere in the app | The maintenance screen replaces the current screen, with a 300 ms cross-fade. Whatever the user was doing is abandoned. |
| The user taps **Retry** and the server is still down | Nothing visible changes |
| The server is back (from Retry or the 15-second timer) | **Automatic sign-in runs again from the start** (Loading screen, biometric prompt if enabled, hub health checks), then the Hubs list. The user does not return to the screen they were on. |
| It happens on the Welcome, Login or Registration screen | The same takeover. On recovery, automatic sign-in finds no session and shows the **Welcome** screen; anything typed is lost. |

## The "phone is on a hub's Wi-Fi" guard

Before each server request the app reads the name of the Wi-Fi network the phone is on (with any
quote marks removed). If it matches **"Cartell Hub " followed by a MAC address** (for example
`Cartell Hub 48:27:E2:B1:94:44`), the request is refused inside the app with:

> "We detected you are on a HUB's network. Please connect to your own WiFi network and try again."

- Outside pairing, each refusal is reported to Sentry, because it usually means the phone has
  re-joined a hub's network by itself.
- During pairing it is expected for a few seconds, so only a breadcrumb (a note attached to later
  reports) is recorded.
- If the phone's Wi-Fi name cannot be read (common without location permission), the guard lets
  the request through. A failure to read the name is reported to Sentry with code `cbf7f`.

Where the message appears depends on the screen; often it is not shown at all, and the screen
simply fails to load. See [A5](A5-message-catalogue.md).

## Odd but true

- **The check doubles the number of network calls.** Every real request waits for a maintenance
  check first. The React Native copy reproduces this.
- **Recovery always restarts sign-in.** Even a 20-second blip sends a user who was deep in Hub
  settings back to the Loading screen and then the Hubs list.
- **Retry uses the stock lavender colour**, not a Cartell colour.

## Related

- [01 App start](01-app-start-and-automatic-sign-in.md) · [06 Session](06-session-and-log-out.md) ·
  [11 Hub pairing](11-connect-hub-to-wifi.md)
