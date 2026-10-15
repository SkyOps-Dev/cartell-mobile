# 27 — Alexa Voice Commands

## In short

Cartell has an Amazon Alexa skill. When the system has Alexa enabled, the Help screen shows an
**Alexa Voice Commands** button. It opens a guide listing the four things you can ask Alexa, a
badge showing whether this account is linked, and a button that opens the skill's page so the user
can enable it. The linking itself happens in Amazon's app or website, not in Cartell.

| | |
|---|---|
| **Who** | Users of systems where Alexa is enabled |
| **Where** | Help → **Alexa Voice Commands** (only shown when the server's `alexa_enabled` setting is on) |
| **Flutter source** | `screens/misc/alexa_cheat_sheet.dart`, `components/forms/additional_info_field.dart`, `bloc/main_app/events/go_to_alexa_help_screen_state.dart`, `utilities/constants.dart` (`alexaSkillUri`) |
| **Detailed spec** | `docs/spec/11-account-and-help.md` §7 |
| **Porting plan** | Phase 10 (10.3) |

## What the user sees

The Loading screen shows briefly while the profile is fetched. Then:

- **Top bar**: ☰, logo, **X**.
- **←**, then **"Alexa Voice Command Guide"** with a small pill: green **"Connected"** if the
  account has Alexa linked, red **"Not Connected"** if not.
- A grey info box: "Notifications will automatically be send to Alexa when a sensor is
  triggered".
- Four grey rows that **expand** when their arrow is tapped:

  | Row title | Shown when expanded |
  |---|---|
  | Hub Status - "Tell me about my hubs" | This command gives you information on the hubs connected to your account. |
  | Sensor Status - "Tell me about my sensors" | This command gives you information on the sensors connected to each of the hubs on your account. |
  | Last Event - "When was my last event" | This command gives information on sensors with low battery. |
  | Trigger Integrator - "Open my gates" | This command opens integrator paired to each of the hubs on your account. |

- **Link to Cartell Skill** (full-width amber button): opens the Cartell skill's page in Amazon's
  skill store, in a browser panel inside the app.

## What happens when...

| The user... | What happens |
|---|---|
| taps a row's arrow | The row opens or closes to show its description |
| taps **Link to Cartell Skill** | Opens Amazon's skill page (a long fixed `skills-store.amazon.com/deeplink/...` link built into the app) |
| taps **←** or **X** | Goes back one screen (normally Help) |
| presses Android Back | **Nothing** (Q28) |

## What the app asks of the server

| Request | Expects |
|---|---|
| `GET /profiles/me` | `alexa_enabled`: true if this account has linked Alexa |
| (on the Help screen) `GET /app/settings/?code=alexa_enabled` | whether to offer this screen at all |

## Odd but true

- **Q8**: "Last Event" is described as giving "information on sensors with low battery". The info
  box says "will automatically be **send**". Both are kept word for word.
- **Q28**: Android Back does nothing here.
- If the profile cannot be loaded, the app returns to the Hubs list.

## Related

- [25 Help](25-help-screen.md) · [22 Account settings](22-account-settings.md) ("Connected
  Services") · [12 Hub details](12-hub-details.md) (Open Gate, the in-app equivalent of "Open my
  gates")
