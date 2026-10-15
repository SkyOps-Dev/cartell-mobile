# 01 — App Start and Automatic Sign-In

## In short

When someone opens Cartell, the app decides by itself where to send them: back into their
account if they were signed in before, to the Welcome screen if not, or to a lock screen if they
turned on fingerprint/Face ID unlock. A returning user never types a password again. They stay
signed in for months through stored keys (tokens), and the app checks those keys every time it
starts.

| | |
|---|---|
| **Who** | Everyone, every time the app is opened from scratch (not when it is just brought back from the background) |
| **Flutter source** | `main.dart`, `utilities/start_services.dart`, `screens/bloc_widgets/auth_bloc_widget.dart`, `bloc/auth/events/auto_login_event.dart`, `services/auth_manager/check_creds.dart`, `screens/welcome/load_screen.dart` |
| **Detailed spec** | `docs/spec/01-platform-shell.md` §2.3, §3.3 · `02-config-and-environments.md` §3 · `08-auth-and-session.md` §1, §3 |
| **Porting plan** | Phase 3 (shell, splash), Phase 7 (auth) |

## What the user sees

1. **Launch splash** (drawn by the phone's system, before the app runs):
   - **iOS**: a plain dark navy screen (`#0A0E21`).
   - **Android**: a plain screen that follows the phone's light or dark mode (white in light
     mode). Android 12 and later also shows the Cartell launcher icon in the centre. It then
     turns dark navy once the app draws.
2. **Loading screen**: a dark grey top bar with the white Cartell logo, and a white spinning
   ring in the middle of the screen. Nothing can be tapped.
3. Then exactly one of:
   - the **Hubs list** (the home screen), for a signed-in user, see [09](09-hubs-list.md)
   - the **Welcome screen**, for a signed-out user, see [02](02-welcome-screen-and-debug-info.md)
   - the **Lock screen**, if biometric unlock is on and the check failed, see
     [05](05-biometric-unlock.md)
   - the **maintenance / "can't reach Cartell" screen**, if the server is down, see
     [07](07-maintenance-and-no-connection.md)
4. On a test (non-production) build there is also a small red **"TEST SERVER"** tag (or "BETA
   SERVER", "DEVELOPMENT SERVER") in the top-right corner of every screen. See
   [29](29-environments-and-test-builds.md).

On a fresh install, Android 13+ and iOS also show the **"Allow notifications?"** system prompt
during this sequence, but only for a signed-in user. See [20](20-notifications.md).

## What happens, step by step

### Before the first screen (app start-up work)

These run once per app launch, in this order:

1. The app prints its settings to the developer log (environment name, server address, whether
   HTTPS is used, whether crash reporting is set up, and the hub address).
2. It checks that the configured hub address is a valid IPv4 address. If not, the app refuses to
   start. This only matters for developer builds that set the address by hand.
3. **Crash and error reporting** (Sentry) is switched on. See [31](31-error-reporting-and-logging.md).
4. The in-memory data store for hubs, sensors, events, users, locations and firmware is created.
   See [A2](A2-data-kept-on-the-phone.md).
5. A **background timer** starts that re-checks the session every **15 seconds** for as long as
   the app process lives. See [06](06-session-and-log-out.md).
6. **Firebase** (push notifications) is started and the app begins listening for incoming
   notifications and for push-token changes. See [20](20-notifications.md).
7. The first screen (the Loading screen) is drawn.

### Automatic sign-in ("auto-login")

The moment the app's sign-in brain is created, it runs automatic sign-in:

1. Show the **Loading screen**.
2. **Housekeeping**: delete any email, password or "credentials saved" flag that a very old app
   version may have stored. This runs every launch and never blocks sign-in, even if it fails.
3. **Is there a stored access token?** If not, the user has never signed in, or signed out, so go
   to the **Welcome screen**. Stop.
4. **Biometric gate** (only if the user turned it on): the phone shows its fingerprint/Face ID
   prompt with the reason "Unlock Cartell".
   - Recognised: carry on.
   - Fingerprint/face no longer set up on the phone: switch the setting off and carry on.
   - Too many failed attempts: show the Lock screen with "Too many attempts. Use your password
     to sign in instead." Stop.
   - Cancelled or not recognised: show the Lock screen. Stop.
5. **Sign-in check, up to 3 attempts.** Each attempt does all of the following, and stops at the
   first attempt that works:
   1. Confirm the session is valid: check the access token with the server, and if it has
      expired, swap the refresh token for a new pair. See [06](06-session-and-log-out.md).
   2. Ask for notification permission if it has not been given yet (does not wait for the
      answer).
   3. Get this phone's current push-notification token from Firebase, save it if it changed,
      and **always** send it to the server.
   4. Load the list of hubs, and ask the server to request a fresh **health report** from every
      hub that is currently connected.
   5. Load the user's own details (name, email, phone).
6. **All 3 attempts failed**: go to the **Welcome screen**. The stored tokens are **not** deleted,
   so the next launch tries again.
7. **Success**: load the list of hubs once more and open the **Hubs list**.
8. **Any unexpected error** at any point: go to the Welcome screen.

### When automatic sign-in runs again later

It is not only a start-up step. The same sequence (including the biometric prompt) runs again when:

- the user taps **Unlock** on the Lock screen
- the server comes back after the maintenance or "can't reach Cartell" screen (see [07](07-maintenance-and-no-connection.md))
- an error inside the app is traced to a dead session (see [06](06-session-and-log-out.md))

## What the app asks of the server

In order, for a signed-in user with one connected hub. Every request is preceded by a
maintenance check, `GET /maintenance-mode/` (see [07](07-maintenance-and-no-connection.md)).

| # | Request | Sends | Expects |
|---|---|---|---|
| 1 | `POST /auth/jwt/verify` | `token` = access token | 200 means the access token is still good |
| 2 | `POST /auth/jwt/refresh` (only if 1 failed) | `refresh` = refresh token | 200 with new `access` and `refresh` tokens, both stored |
| 3 | `POST /notifications/register_device/` | `token` (push token), `device_name` (phone model, e.g. "Pixel 7"), `platform` ("Android" or "iOS") | anything (result is only logged) |
| 4 | `GET /devices/` | | list of hubs |
| 5 | `POST /devices/{id}/message/get_health/` (each connected hub) | empty | status below 300 (a failure is reported to Sentry but ignored) |
| 6 | `GET /auth/users/me/` | | the user's id, email, first and last name, phone, email-alert preference |
| 7 | `GET /devices/` | | list of hubs, used to draw the Hubs list |

All requests after #2 carry the header `Authorization: JWT <access token>`. Bodies are sent as
web-form data (`application/x-www-form-urlencoded`), not JSON. Each request gives up after **15
seconds**.

"get_health" does not answer with the hub's health. It asks the server to send the hub a message
over the hub's own live connection, so that the hub reports in and its status is fresh.

## When something goes wrong

| Situation | What the user sees |
|---|---|
| Session can't be renewed (refresh token expired or rejected) | Welcome screen. No message. |
| Server down for maintenance | The maintenance screen ("The server is currently undergoing an update...") |
| No internet, or server unreachable | The "We can't reach Cartell right now" screen, and then, once all three sign-in attempts have failed, the Welcome screen. See "Odd but true". |
| Phone is still connected to a hub's own Wi-Fi ("Cartell Hub ...") | Every request is refused by the app itself (see [07](07-maintenance-and-no-connection.md)), so sign-in fails and the Welcome screen appears |
| Biometric cancelled | Lock screen ("Cartell is locked") |
| Biometric locked out | Lock screen with "Too many attempts. Use your password to sign in instead." |

## Odd but true

- **The hubs list is downloaded twice** on every successful sign-in (step 5.4 and step 7), and a
  third time when the Hubs screen opens. All three are real network calls.
- **Every request is preceded by a maintenance check**, and most steps also run a session check
  that does its own maintenance check first. So the sign-in above makes two to three times as
  many network calls as the table shows. The React Native copy makes the same calls in the same
  order.
- **A failed sign-in keeps the tokens.** The user lands on Welcome, but if they simply close and
  reopen the app later (with internet back), they are signed straight in.
- **Unreachable server during start-up**: the "can't reach Cartell" screen and the sign-in attempt
  run side by side. When the sign-in attempts finally give up, the app moves to the Welcome
  screen, replacing the "can't reach" screen. Confirm this on a real device when capturing the
  reference recordings (porting plan Phase 1).
- **Opening the app from a notification** does exactly the same as opening it from the icon.
  There is no "jump to the event" behaviour. See [20](20-notifications.md).
- **Nothing is restored after the app is closed.** The app always starts at the Loading screen
  and lands on the Hubs list, whatever screen the user was on before.

## Related

- [04 Log in](04-log-in.md) · [05 Biometric unlock](05-biometric-unlock.md) ·
  [06 Session and log out](06-session-and-log-out.md) · [07 Maintenance](07-maintenance-and-no-connection.md)
- [20 Notifications](20-notifications.md) for the token and permission steps.
