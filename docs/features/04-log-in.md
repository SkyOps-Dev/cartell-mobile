# 04 — Log In

## In short

The user types their email and password and taps **Log In**. If they are correct, the app stores
the sign-in keys, sets up notifications, offers to save the password to the phone's password
manager, may offer fingerprint/Face ID unlock, and opens the Hubs list. The app never stores the
password itself. After this one login the user stays signed in automatically (see
[06](06-session-and-log-out.md)).

| | |
|---|---|
| **Who** | Users who are signed out, or who chose "Use password instead" on the Lock screen |
| **Where** | Welcome → **Log In**; Registration → "Login Here"; after a successful registration; Lock screen → "Use password instead" |
| **Flutter source** | `screens/welcome/login_screen.dart`, `bloc/auth/events/attempt_logging_in_event.dart`, `services/auth_manager/check_creds.dart`, `services/requests/auth_requests.dart` (`login`) |
| **Detailed spec** | `docs/spec/08-auth-and-session.md` §5, §9 · `09-notifications.md` §6 |
| **Porting plan** | Phase 7 (steps 7.4, 7.6) |

## What the user sees

No top bar. A round **←** button floats top-left. In the centre:

1. The Cartell logo. It is **hidden while the keyboard is open**, to make room.
2. **Email** field ("Enter your email"), email keyboard. The keyboard's action key moves to the
   password field.
3. **Password** field ("Enter your password"), hidden text, with an eye button ("Show password"
   / "Hide password") to reveal it. The keyboard's action key ("done") logs in.
4. **Forgot Password**: amber text link, right-aligned.
5. **Log In** button (blue).
6. "Don't have an account?" followed by an amber "Create One Here" link.

If the user came from Registration, the email is already filled in.

## What happens when...

| The user... | What happens |
|---|---|
| taps **Log In** (or "done" on the keyboard) | Login is attempted (below) |
| leaves a field empty and taps **Log In** | The empty field(s) show red text: "Email field cannot be empty" and/or "Password field cannot be empty". Nothing is sent. The message disappears as soon as they type in that field. |
| taps **Forgot Password** | Opens `<server>/password_reset` in a browser panel **inside the app** (Chrome Custom Tab on Android, Safari view on iOS). Password reset itself happens on the website. |
| taps "Create One Here" | Goes to the Registration screen |
| taps **←** | Goes back to the Welcome screen |
| presses Android **Back** | The app closes (goes to the background) |
| taps the email or password field | The phone may offer saved Cartell passwords (autofill) |

### The login attempt

1. A dimmed overlay with a spinner covers the form, and **Log In** and **←** are disabled. The form
   stays mounted underneath, so the password manager can still see the fields.
2. The app sends the email and password to the server.
3. **Wrong email or password (401):** popup **"Account Not Found"** / "Please check your
   credentials and try again." The form comes back with the email kept and the password field
   kept as typed.
4. **Any other refusal (status 300 or above):** popup **"An Error Occured"** / "An error occured.
   Please try again. If problem persists, contact support"
5. **Success:**
   1. The phone's password manager is told to save the credentials ("Save password?" prompt).
      This is the **only** time the app ever asks it to save. Failed logins are never saved.
   2. The two sign-in keys (access and refresh tokens) from the server are stored securely on the
      phone. Any email/password stored by very old versions is deleted.
   3. Notification permission is requested if not already granted (the system prompt may
      appear).
   4. The push-notification token is checked and registered with the server (see
      [20](20-notifications.md)).
   5. The user's details are loaded.
   6. **Biometric offer** (once per phone): if the user has never been asked, and the phone has a
      fingerprint or face enrolled, the popup **"Unlock with biometrics?"** appears: "Use your
      fingerprint or face to open Cartell instead of typing your password. You can change this
      later in Account Settings." with **Cancel** and **Okay**. See [05](05-biometric-unlock.md).
   7. The list of hubs is loaded and the **Hubs list** opens. The biometric popup, if shown,
      stays on top of it.

## What the app asks of the server

| # | Request | Sends | Expects |
|---|---|---|---|
| 1 | `POST /auth/jwt/create` (no sign-in header) | `email`, `password` | 200 with `access` and `refresh` tokens; 401 for bad credentials |
| 2 | `POST /notifications/register_device/validate/` | `token` (stored push token, if any) | JSON `{"valid": true/false}` |
| 3 | `POST /notifications/register_device/` | `token`, `device_name`, `platform` | anything |
| 4 | `GET /auth/users/me/` | | the user record |
| 5 | `GET /devices/` | | the list of hubs |

Each request is preceded by the maintenance check. The sign-in header `Authorization: JWT
<token>` is added from request 2 on.

## When something goes wrong

| Situation | Message |
|---|---|
| Empty email / password | Inline: "Email field cannot be empty" / "Password field cannot be empty" |
| Wrong credentials | "Account Not Found" / "Please check your credentials and try again." |
| Server refuses for another reason | "An Error Occured" / "An error occured. Please try again. If problem persists, contact support" |
| Network failure, timeout, or any error during the success steps | The same "An Error Occured" popup, and the Login screen comes back |
| Server down / unreachable | The maintenance or "can't reach Cartell" screen may take over (see [07](07-maintenance-and-no-connection.md)) |

## Odd but true

- **"Occured"** is misspelled twice in the error popup (Q35). The copy keeps it.
- **Passwords are never stored by the app.** "Remember me" is achieved purely through the tokens.
- **The biometric offer is asked once per phone.** The app records the question as "declined"
  *before* showing it, so it never comes back, whatever the answer. The only way to turn it on
  later is the switch in Account Settings.
- On iOS, the password-save prompt only works against the real Cartell servers
  (`cartellap.com`, `test.cartellap.com`, `beta.cartellap.com`), never against a developer's
  local server. This is an Apple restriction.

## Related

- [01 App start](01-app-start-and-automatic-sign-in.md) · [05 Biometric unlock](05-biometric-unlock.md) ·
  [06 Session and log out](06-session-and-log-out.md) · [20 Notifications](20-notifications.md)
