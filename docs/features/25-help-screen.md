# 25 — Help Screen

## In short

The Help screen shows which version of the app is installed and which server it uses, and offers
buttons for customer support, the FAQ, the "About Us" page, sending feedback, and the Alexa voice
command guide when Alexa is enabled.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Where** | Menu → **Help**; **Contact Support** on a flagged sensor ([18](18-sensor-details.md)) |
| **Flutter source** | `screens/misc/contact_us.dart`, `components/conditional_view_widget.dart`, `services/requests/settings_requests.dart` |
| **Detailed spec** | `docs/spec/11-account-and-help.md` §6 · `18-cross-cutting.md` §5 |
| **Porting plan** | Phase 10 (10.3) |

## What the user sees

- **Top bar**: ☰, logo, **X**.
- **←**, then **"Help"** (very large, bold).
- Four centred lines:
  "Version: 1.12.5", "Build: 193", "Env: LIVE", "App Name: Cartell".
- Buttons, top to bottom:

  | Button | Colour | Does |
  |---|---|---|
  | **Customer Support** (headset) | blue | Opens `https://www.cartell.com/hub-support` |
  | **FAQ** (question mark) | amber | Opens `https://www.cartell.com/hub-faq` |
  | **About Us** (info) | blue | Opens `https://cartell.com/about/` |
  | **Send Feedback** (speech bubble) | amber | Opens the feedback panel ([26](26-feedback.md)) |
  | **Hub Light Guide** (satellite dish) | blue | **Developer builds only.** Opens [28](28-hub-light-guide.md) |
  | **Alexa Voice Commands** (Amazon logo) | blue | **Only if the server's `alexa_enabled` setting is on.** Opens [27](27-alexa-voice-commands.md) |

Web pages open in a browser panel **inside the app** (Chrome Custom Tab on Android, Safari view on
iOS), with a close button that returns to Cartell.

## What happens when...

| The user... | What happens |
|---|---|
| taps **←** or presses Back | Hubs list |
| taps **X** | Goes back **one screen**, to wherever the user was before Help (Q29) |

## What the app asks of the server

`GET /app/settings/?code=alexa_enabled`, every time the screen is drawn, to decide whether to show
the Alexa button. Nothing else; the version details come from the phone.

## Odd but true

- **Q29**: **X** and **←** can lead to different places.
- **Q34**: the Alexa setting is fetched again on every redraw.
- The version line uses "Env:" with the internal environment name (LIVE, TEST, BETA,
  DEVELOPMENT).
- There is no phone number, email address or chat for support in the app itself; all support goes
  through the website.

## Related

- [26 Feedback](26-feedback.md) · [27 Alexa](27-alexa-voice-commands.md) ·
  [28 Hub light guide](28-hub-light-guide.md) · [29 Environments](29-environments-and-test-builds.md)
