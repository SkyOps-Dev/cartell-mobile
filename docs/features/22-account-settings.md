# 22 — Account Settings

## In short

The user's account page. It shows their name, email, password (as "Change") and phone number,
each tappable to edit except the email. It holds the account-wide switches for **push
notifications**, **email notifications** and, on capable phones, **biometric unlock**. A ⋮ menu
holds **Delete Account**. If the Alexa integration is turned on for the system, a "Connected
Services" line shows whether this account has linked Alexa.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Where** | Menu → **Account Settings**; back from the edit forms |
| **Flutter source** | `screens/account/account_settings.dart`, `screens/account/account_settings_skeleton.dart`, `components/reusable_listing.dart`, `components/conditional_view_widget.dart`, `components/forms/auto_switch.dart`, `bloc/main_app/events/go_to_account_settings_screen.dart`, `services/requests/user_requests.dart`, `settings_requests.dart` |
| **Detailed spec** | `docs/spec/11-account-and-help.md` §1, §2 |
| **Porting plan** | Phase 10 (10.1) |

## What the user sees

### While loading

The screen appears at once as a **skeleton**: the "Account Settings" heading, four grey placeholder
rows, and a small blue spinner at the bottom. The real content replaces it when the account
details arrive.

### Loaded

- **Top bar**: ☰, logo, **⋮** with **Delete Account** (person-with-✗ icon).
- A row with **←** on the left and, on the right, **"Connected Services: "** followed by an Amazon
  logo if this account has Alexa linked. The whole "Connected Services" line only appears if the
  server's `alexa_enabled` setting is on.
- A large blue person-with-gear icon (tapping it does nothing), then **"Account Settings"** in amber.
- Four rows (blue icon, label, value), separated by amber lines:

  | Label | Value | Tap opens |
  |---|---|---|
  | **Name** | "First Last" | Edit name ([23](23-edit-name-phone-and-password.md)) |
  | **Email** | the email | nothing (email cannot be changed in the app) |
  | **Password** | "Change" | Edit password ([23](23-edit-name-phone-and-password.md)) |
  | **Phone** | "(555) 123-4567" for a 10-digit number; otherwise the number as stored; "Enter Phone Number" if empty | Edit phone ([23](23-edit-name-phone-and-password.md)) |

  With large text, each row stacks its label and value.
- **"Unlock with Biometrics:"** + switch. Shown if the phone has a fingerprint/face enrolled, or the
  setting is already on, or the setting could not be read. See [05](05-biometric-unlock.md).
- **"Receive Notifications:"** + switch: account-wide push alerts.
- **"Receive Email Notifications:"** + switch: account-wide email alerts.

On iOS the switch rows sit flush with the edges (0 px side padding); on Android they have 20 px.

## What happens when...

| The user... | What happens |
|---|---|
| opens the screen | Skeleton, then the user and profile are loaded **at the same time**. If the user leaves first, nothing jumps back. |
| flips **Receive Notifications** | Saved immediately. Toast "Notifications turned on." / "...off.". On failure the switch flips back: "Error encountered of type: <error name>. Notifications are still off/on. Please try again soon." |
| flips **Receive Email Notifications** | Same pattern: "Email notifications turned on." / "...off.", or "Error encountered of type: <error name>. Email notifications are still off/on. Please try again soon." |
| flips **Unlock with Biometrics** | Saved on the phone only. Toasts "Cartell will ask for your fingerprint or face when it opens." / "Biometric unlock turned off." / failure "Could not save that setting. Please try again." |
| taps ⋮ → **Delete Account** | See [24 Delete account](24-delete-account.md) |
| taps **←** or presses Back | Hubs list |

## What the app asks of the server

| When | Request | Sends | Expects |
|---|---|---|---|
| Opening | `GET /auth/users/me/` | | `id`, `email`, `first_name`, `last_name`, `phone_no`, `should_send_emails` |
| Opening | `GET /profiles/me` (no trailing slash) | | `user`, `should_send_notification`, `locations`, `alexa_enabled` |
| Opening, **and again every time the screen redraws** | `GET /app/settings/?code=alexa_enabled` | | `value` read as true/false; decides whether "Connected Services" shows |
| Notifications switch | `PATCH /profiles/me/` | `should_send_notification` = `"true"`/`"false"` | 200 |
| Email switch | `PATCH /auth/users/me/` | `should_send_emails` = `"true"`/`"false"` | 200 |

## When something goes wrong

| Situation | Result |
|---|---|
| The account details cannot be loaded | The app returns to the Hubs list (or Welcome if the session is dead). No message. |
| The user has **no phone number at all** on the server (null, rather than empty) | The screen cannot be drawn and shows a blank/grey error area (Q30). Accounts created in the app always send a phone value (possibly empty), so this mainly affects accounts made another way. |
| The `alexa_enabled` setting cannot be read | The "Connected Services" line stays hidden |

## Odd but true

- **Q34**: the Alexa setting is re-fetched from the server every time the screen redraws (for
  example, on every switch flip).
- **Q30**: a missing phone number breaks the screen.
- **A hidden Delete Account button** exists at the bottom of the screen but is never shown. The
  only way in is the ⋮ menu.
- The large person-with-gear icon looks tappable but does nothing.
- The "Error encountered of type: ..." messages include the internal error class name, e.g.
  "UnableToUpdateUserInformationException".

## Related

- [23 Edit name, phone, password](23-edit-name-phone-and-password.md) · [24 Delete account](24-delete-account.md) ·
  [05 Biometric unlock](05-biometric-unlock.md) · [20 Notifications](20-notifications.md) ·
  [27 Alexa](27-alexa-voice-commands.md)
