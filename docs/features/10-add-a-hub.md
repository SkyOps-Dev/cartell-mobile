# 10 — Add a Hub

## In short

Adding a hub registers a physical hub to the user's account. The user names it and identifies it
by its **MAC address**, either by scanning the QR code printed on the hub or by typing the address.
The app sends a scrambled (hashed) form of the MAC address so the server can check it is a genuine
Cartell hub. When the server accepts it, a "Hub Added to Account!" screen offers to go straight on
to connecting the hub to Wi-Fi.

Adding a hub and connecting it to Wi-Fi are **two separate steps**. A hub can be on the account
while still offline.

| | |
|---|---|
| **Who** | Homeowners setting up a new hub |
| **Where** | Hubs list → **+** button, or ⋮ → **Add Hub** |
| **Flutter source** | `screens/devices/add_device/**` (screen, its own state machine and 8 events), `components/forms/qr_scanner.dart`, `components/forms/text_field_with_post_change_validators.dart`, `components/rounded_loader.dart`, `services/hash_mac_address.dart`, `services/text_formatters.dart` |
| **Detailed spec** | `docs/spec/15-add-hub.md` · `17-udp-protocol-and-crypto.md` §4 (MAC hashing) |
| **Porting plan** | Phase 14 |

## What the user sees

### Add hub screen

Top bar with ☰ and the logo. Content:

1. **←** arrow.
2. **"Enter Hub Information"** (bold heading).
3. A large **amber tile** with a QR-scanner icon and the words "Tap To Scan QR Code".
4. **Hub Name** field.
5. Once a MAC address is involved, a **Mac Address** field appears below the name. It accepts only
   hex digits, capitalises them, and inserts the colons for you (`XX:XX:XX:XX:XX:XX`).
6. **Submit** button (amber). It is **grey and disabled** until both the name and the MAC address
   have something in them. While sending, it turns into an amber bar with a white spinner.
7. Below, until the MAC field is shown, a blue link: **"Tap to Add Mac Address Manually"**.

Field messages appear after the user has been in a field and left it empty: "Device name cannot be
empty." and "Mac address cannot be empty."

### QR scanner

A full-screen camera view with a standard top bar titled **"Scan Hub QR Code"** and a back arrow.
A dark band across the bottom quarter shows:

- while searching: an amber spinner and "Please scan the QR code on the hub"
- if a code is seen that is **not** a MAC address: an "x" icon, "That does not seem to match a QR code
  on a hub", and a **Clear scan** button to try again
- a valid code closes the scanner **immediately** and fills in the MAC address

The phone asks for **camera permission** the first time.

### "Hub Added to Account!" screen

No top bar. Centred:

1. "Hub Added to Account!"
2. A large amber ✓.
3. "Your hub is now added to your account."
4. "Next, we will pair the hub to your Wi-Fi. Are you ready to proceed?"
5. **Proceed and Pair To Wi-Fi** (amber): starts [11 Connect hub to Wi-Fi](11-connect-hub-to-wifi.md).
6. **Pair to Wi-Fi Later** (blue): opens the new hub's [details screen](12-hub-details.md).

Android Back here opens the hub's details screen.

## What happens when...

| The user... | What happens |
|---|---|
| opens the screen | In the background the app loads the user's **profile** to find their location (every account has one; the hub is added to the first). |
| taps the amber QR tile | The camera scanner opens |
| scans a valid hub code (`AA:BB:CC:DD:EE:FF` or with dashes) | The scanner closes; the MAC field appears, filled in and **locked** |
| taps the locked MAC field | Popup **"Change Mac Address"** / "The Mac Address of your hub has already been scanned. Are you sure you'd like to change it?" → **Okay** unlocks it. There is no Cancel button; only Android Back dismisses it without unlocking (Q45). |
| taps "Tap to Add Mac Address Manually" | The MAC field appears, empty and editable (or locked, if a scanned address is already there) |
| taps **Submit** | Sends the hub to the server (below) |
| taps **←** or presses Back | Hubs list |

### Submitting

1. The button becomes a spinner.
2. The MAC address is converted to **lower case** and then **hashed** (HMAC-SHA256 with a secret key
   built into the app, different for production and test builds). The plain MAC address is never
   sent.
3. The app sends the name and hashed MAC to the user's location.
4. **Accepted (status below 300):** the app loads the new hub's details and opens **"Hub Added to
   Account!"**.
5. **Refused (300–499):** popup **"Adding Hub Failed"** with the server's reasons (one per line),
   or "An Error occurred. Please try again." if the server gave none. The form comes back.
6. **Server error (500+):** popup **"Adding Hub Failed"** / "Failed to add hub. Please try again. If
   the problem persists, please contact support."

## What the app asks of the server

| When | Request | Sends | Expects |
|---|---|---|---|
| Screen opens | `GET /profiles/me` | | `locations` list; the first location's `id` is used |
| Submit | `POST /locations/{locationId}/devices/` | `name`, `mac_address` = 64-character hex hash | below 300 with the new hub's `id`; on 4xx, optional `non_field_errors` list |
| After success | `POST /devices/{id}/message/get_health/`, then `GET /devices/{id}/` | | the new hub's full record |

## When something goes wrong

| Situation | Message |
|---|---|
| Scanned code is not a MAC address | In the scanner: "That does not seem to match a QR code on a hub" |
| Server refuses the hub (e.g. already registered, not a genuine hub) | "Adding Hub Failed" / server's `non_field_errors`, or "An Error occurred. Please try again." |
| Server error | "Adding Hub Failed" / "Failed to add hub. Please try again. If the problem persists, please contact support." |
| The profile cannot be loaded when the screen opens | The screen breaks: the app removes a screen it should not and tries to show a pairing failure page that cannot work outside pairing (Q14). Code `15b12a`, message "An error occurred while adding a hub. If this continues to happen contact support." |
| Network drops during Submit | The spinner keeps spinning (the error is not caught) |

## Odd but true

- **Q12**: an internal guard that shows the toast "Make sure you enter a Name and valid Mac Address
  before submitting" also leaves the spinner on. It cannot normally be reached, because the button
  is disabled until both fields are filled.
- **Q13**: after confirming "Change Mac Address", pressing Submit shows the "Change Mac Address"
  popup again, because Submit re-runs the last action to redraw the screen.
- **Q15**: a server message from an earlier failed attempt can reappear in a later failure popup,
  because the message is kept between attempts.
- **Q16**: an internal "name is valid" flag is never updated. It has no visible effect.
- **The plain MAC address never leaves the phone**, only its hash. The hash key differs between
  production and test builds, and is how the release tooling tells the builds apart.
- A server-side "validate this hub" check exists in the app's code but is switched off (see
  [A4](A4-hidden-and-unused-features.md)).

## Related

- [11 Connect hub to Wi-Fi](11-connect-hub-to-wifi.md) · [12 Hub details](12-hub-details.md) ·
  [32 Camera permission](32-permissions-and-platform-behaviour.md)
