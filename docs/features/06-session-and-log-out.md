# 06 — Staying Signed In, and Logging Out

## In short

After one login the user stays signed in for months. The app holds two keys from the server: a
short-lived **access token** that goes with every request, and a long-lived **refresh token**
(about 180 days, replaced with a new one every time it is used) that gets a new access token when
the old one expires. The app renews these on its own, in the background, without the user
noticing. **Log Out** in the menu deletes both keys and unregisters the phone from notifications.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Flutter source** | `services/requests/auth_requests.dart` (`AuthRequestManager`), `services/requests/authorized_requester.dart`, `services/requests/networking.dart`, `utilities/start_services.dart`, `bloc/auth/events/attempt_log_out_event.dart`, `bloc/main_app/bloc.dart`, `bloc/devices/bloc.dart` |
| **Detailed spec** | `docs/spec/04-networking-and-api.md` §1, §3, §4 · `06-state-and-navigation.md` §4, §5 · `08-auth-and-session.md` §8 |
| **Porting plan** | Phase 4 (4.9, 4.10), Phase 6, Phase 7 (7.8) |

## How the session is kept alive

### The session check

Before almost every server request, the app runs a **session check**:

1. Check the server is reachable (the maintenance check, see [07](07-maintenance-and-no-connection.md)).
   If it is unreachable, report "offline" and stop. Nothing is deleted.
2. If the session was confirmed less than **60 seconds** ago, assume it is still fine and stop.
3. If another session check is already running, wait for that one rather than starting a second.
4. Ask the server whether the access token is still valid (`POST /auth/jwt/verify`). If yes, done.
5. If not, and there is no refresh token, the user is simply "not signed in".
6. Otherwise swap the refresh token for a fresh pair (`POST /auth/jwt/refresh`) and store **both**
   new tokens. The refresh token rotates, so the old one is no longer valid.
7. If the server refuses the refresh token, the session is dead. An error report (code `66c58`)
   goes to Sentry.

### The background timer

From app start, every **15 seconds**, for as long as the app process is alive, the app runs the
session check above. Most runs end at step 2 (confirmed less than a minute ago). The real purpose
of this timer is step 1: it re-checks whether the server is reachable every 15 seconds while the
app is on screen, so the maintenance screens appear and disappear on their own.

### When a request is refused with "401 Unauthorised"

If any request comes back 401, the app forces a full session check (ignoring the 60-second
shortcut) and then **sends the same request once more**:

| Session check result | What happens to the original request |
|---|---|
| Renewed fine | Sent again; that second answer is used, whatever it is |
| Server unreachable | Fails with "The request timed out. Check your internet connection and try again." |
| Server refused the refresh | Fails with a "session expired" error, which the screen handles (below) |

## What the user sees when the session dies mid-use

The session can die while the app is open, for example if the account was deleted elsewhere or the
refresh token expired. When opening a screen fails:

- **Account-level screens** (Account Settings, All Event History, Alexa guide): the app forces a
  session check. If the session is dead, it runs automatic sign-in again, which lands on the
  **Welcome screen**. If the session is fine, the error was something else, and the app returns to
  the **Hubs list**.
- **Hub and sensor screens**: the app forces a session check. If the session is dead, it runs
  automatic sign-in again (→ Welcome). If not, it waits 1 second and reloads the Hubs list; on
  repeated failures it waits 2, then 3 seconds, and after **3 failed attempts in a row** it gives
  up and leaves the screen as it is. The counter resets after any successful load.
  - This applies to screens that must load before they appear: the Hubs list, Firmware updates,
    Connect HUB, and the hub and sensor history lists.
  - Screens that appear first and refresh afterwards (Hub details, Hub settings, About hub, Sensors
    list, Sensor details, About sensor) do **not** bounce the user away on an ordinary failure.
    They stay put and show the last known data, with "Status: Last known connected/disconnected"
    for a hub. Only a dead session takes them through the recovery above.
- **Hub pairing**: three session failures in a row while waiting for the hub end pairing with
  "Your session has expired. Please sign in again to finish setting up your hub." See
  [11](11-connect-hub-to-wifi.md).

No "session expired" popup is ever shown outside pairing; the user simply finds themselves on the
Welcome screen.

## Logging out

### Where

Side menu → **Log Out** (the last item). See [08](08-navigation-and-screen-layout.md).

### What happens

1. The menu closes and a popup asks **"Log Out"** / "Are you sure you want to log out?" with
   **Cancel** and **Okay**.
2. **Cancel** closes the popup. Nothing changes.
3. **Okay** closes the popup straight away, and in the background:
   1. Reads this phone's push-notification token.
   2. If there is one, tells the server to stop sending notifications to it
      (`DELETE /notifications/register_device/` with `token`).
   3. Tells Firebase to discard the token, so this phone gets a new one next time.
      (Failures in 2 and 3 are logged and ignored.)
   4. **Deletes the refresh token, then the access token.** If this fails, the popup **"Could Not
      Sign Out"** / "Your session could not be cleared. Please try again." appears and the user
      stays signed in.
   5. Best effort, ignoring failures: deletes the stored push token, deletes any password saved by
      old app versions, and resets the biometric setting to *never asked*.
   6. Shows the **Welcome screen**.

### What the app asks of the server

| Request | Sends | Notes |
|---|---|---|
| `DELETE /notifications/register_device/` | `token` (form body on a DELETE) | Skipped if no token is stored. Failure is ignored. |

Nothing tells the server to invalidate the tokens themselves; they are simply forgotten on the
phone.

## What stays behind after logging out

The in-memory copies of hubs, sensors and user details stay in memory until the app is closed.
They are not visible: the user is on the Welcome screen, and the next login replaces them.

## Odd but true

- **The refresh token is deleted first on purpose.** If only the second delete fails, what is left
  (an access token) expires on its own and cannot be renewed.
- **The confirmation popup closes immediately**, before the logout work finishes. The Welcome
  screen appears a moment later.
- **Dead sessions do not explain themselves.** The user lands on Welcome without a message
  (except during hub pairing).

## Related

- [01 App start](01-app-start-and-automatic-sign-in.md) · [04 Log in](04-log-in.md) ·
  [07 Maintenance](07-maintenance-and-no-connection.md) · [20 Notifications](20-notifications.md) ·
  [A2 Data on the phone](A2-data-kept-on-the-phone.md)
