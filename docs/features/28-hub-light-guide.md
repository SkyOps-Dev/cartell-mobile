# 28 — Hub Light Guide

## In short

The hub has one coloured light next to its antenna, and its blink pattern tells you what the hub is
doing. The app draws these patterns as **animated circles** in two places: inside the pairing
wizard (so the user can match what they see), and on a **Hub Light Guide** screen that lists every
pattern. The guide screen is only reachable in **developer builds**. Store users meet the patterns
only during pairing.

| | |
|---|---|
| **Who** | Developers and testers (guide screen); everyone during hub pairing (individual patterns) |
| **Where** | Help → **Hub Light Guide** (developer builds only); pairing steps 3 and the reset screen; the "light guide" panel while waiting for a hub |
| **Flutter source** | `components/hub_light_widget.dart`, `screens/misc/hub_lights.dart`, `screens/devices/connect_hub_to_wifi/widgets/hub_light_readings.dart` |
| **Detailed spec** | `docs/spec/07-design-system.md` §11 (HubLightWidget) · `11-account-and-help.md` §8 · `16-hub-pairing.md` §7 |
| **Porting plan** | Phase 5 (component), Phase 10 (guide screen), Phase 15 (pairing) |

## The patterns

Each animated light is a 45 px circle with a white rim. Between flashes the circle is dark grey.
The timings are exact and loop forever:

| Name (as shown) | Meaning (built into the app) | Pattern |
|---|---|---|
| **Wi-Fi Pairing Mode** | Waiting to be given a Wi-Fi network to join. | light green for 0.06 s, off for 3 s (a brief flash every 3 s) |
| **Sensor Pairing Mode** | Waiting for a new sensor to connect. | light blue 1 s, off 1 s |
| **Connected to Server** | Everything is set up correctly. | solid light green |
| **Connected to Wi-Fi, But Not Server** | On your network, but not reaching us. Usually that network has no internet. | solid light blue |
| **Not Connected to Wi-Fi** | Cannot find the network it was set up with. | green 1 s, off 1 s, blue 1 s, off 1 s |
| **Resetting to Factory Defaults** | Currently deleting all on-device settings. (Reset button is being held in.) | red 0.1 s, off 0.1 s (fast flicker) |
| **Unknown Mode** | Unknown state. Please call support. | solid red |

Accessibility: each light is announced to screen readers by its name. When the phone's "reduce
motion" setting is on, the light does not blink; it shows its first colour steadily.

## The guide screen (developer builds)

- Top bar: ☰, logo, **X**.
- "Hub Light Guide" (very large, bold).
- Seven rows, each with an animated light on the left and its **name** on the right, in this order:
  Wi-Fi Pairing Mode, Sensor Pairing Mode, Connected to Server, Connected to Wi-Fi, But Not Server,
  Not Connected to Wi-Fi, Resetting to Factory Defaults, Unknown Mode. The meanings are not shown on
  this screen.
- **Return** (amber): back one screen.
- **X**: back one screen. Android Back: **nothing** (Q28).

## Where the patterns appear during pairing

| Place | Pattern(s) |
|---|---|
| Step 3, "Check the Light on Your Hub" | Wi-Fi Pairing Mode |
| Reset screen, "Hold the Reset Button In" | Resetting to Factory Defaults |
| "Your hub could not join that network" | Wi-Fi Pairing Mode |
| Waiting-for-hub light guide | "no light" (an empty grey ring, announced as "No light"), Connected to Server, Connected to Wi-Fi But Not Server, Wi-Fi Pairing Mode, each with its own advice line (see [11](11-connect-hub-to-wifi.md)) |

## What the app asks of the server

Nothing. The patterns are drawn by the app and are not read from the hub.

## Odd but true

- **Q28**: Back does nothing on the guide screen.
- `docs/spec/11-account-and-help.md` §8 lists the fourth name as "Connected to Wi-Fi But Not
  Server". The code has a comma: "Connected to Wi-Fi, But Not Server". The code is correct; the
  spec needs this small fix.

## Related

- [11 Connect hub to Wi-Fi](11-connect-hub-to-wifi.md) · [25 Help](25-help-screen.md) ·
  [17 Add a sensor](17-add-a-sensor.md) (Sensor Pairing Mode)
