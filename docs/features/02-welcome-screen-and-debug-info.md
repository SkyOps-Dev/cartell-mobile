# 02 — Welcome Screen and "Open Debug Info"

## In short

The Welcome screen is the front door for anyone who is not signed in. It offers two choices, log
in or register, plus a small **Open Debug Info** button. That button opens a panel showing the
app version and which server the app uses. It can also test the connection, and on test builds it
can switch to a different server.

| | |
|---|---|
| **Who** | Signed-out users; support staff and testers (debug panel) |
| **Where** | Shown automatically after start-up when nobody is signed in, after logging out, after deleting the account, and from the **Back** arrow on Login and Registration |
| **Flutter source** | `screens/welcome/welcome_screen.dart`, `screens/misc/debug_menu.dart` |
| **Detailed spec** | `docs/spec/08-auth-and-session.md` §2 · `02-config-and-environments.md` §5 |
| **Porting plan** | Phase 7 (step 7.1) |

## What the user sees

### Welcome screen

No top bar. On a dark navy background, centred, top to bottom:

1. The white **Cartell logo**.
2. **Log In** button (blue, with an "enter" arrow icon).
3. **Register** button (amber/yellow, with a clipboard icon).
4. **Open Debug Info**: a small rounded button in the default (lavender-on-grey) style. It is
   the only lavender element in the whole app.

On wide screens (tablets, 800 px or wider) the side margins grow from 10% to 20% of the width.
The vertical spacing is calculated from the screen's height in **physical pixels**, so the gaps
look slightly different on phones with different pixel densities (see "Odd but true").

### Debug Info panel

A grey panel slides up from the bottom of the screen. Its height is 30% of the screen height
counted in **physical pixels** (see "Odd but true"), so on a typical phone with 3× pixel density
it covers about 90% of the screen (720 of 800 points on the RMX5070), not 30%.
Tapping outside it closes it. It shows:

- "Version: 1.12.5"
- "Build Number: 193"
- "Environment Name: LIVE" (or TEST, BETA, DEVELOPMENT). This line is shown on every build,
  including the store build.
- **Test Connection** (amber button)
- **Verify Sentry Setup** and **Reset Show Feedback**: only in developer builds run from a
  computer, never in a store build.
- **Change Environment**: only in builds that were *not* made for production (test, beta and
  developer builds).
- **Close** (blue).

## What happens when...

| The user... | What happens |
|---|---|
| taps **Log In** | Login screen opens, empty. See [04](04-log-in.md). |
| taps **Register** | Registration screen opens, empty. See [03](03-create-an-account.md). |
| taps **Open Debug Info** | The Debug Info panel slides up. |
| taps **Test Connection** | A popup opens with four checks (below). |
| taps **Verify Sentry Setup** (developer builds) | The app deliberately crashes the tap handler with "This is a test exception", which must then appear in Sentry. Nothing visible happens on screen. |
| taps **Reset Show Feedback** (developer builds) | Turns the "Give Feedback" prompt back on for this phone. See [26](26-feedback.md). |
| taps **Change Environment** (test builds) | The panel switches to the server picker. See [29](29-environments-and-test-builds.md). |
| taps **Close** or outside the panel | The panel closes. |
| presses Android **Back** on the Welcome screen | The app closes (goes to the background). |

### The connection test

The popup is the standard Cartell popup with its amber "!" icon at the top, but with an empty
title and message, then the four rows. Each row starts with a spinner and turns
into a ✓ (passed) or ✗ (failed). Each check waits 1 second before starting and gives up after 15
seconds.

| Row (exact text) | What it checks | Passes when |
|---|---|---|
| "Internet Access" | `GET https://google.com` | status 200 |
| "Server Access" | `GET /test/` on the current server | status 200 |
| "Can Reach Spash Page" | `GET` the server's home page | status 200 |
| "Can Post to Server" | `POST /echo/` with the JSON body `{"msg":"this is a test"}` | status 200 and the server echoes `msg` back unchanged |

The popup has one **Okay** button that closes it.

## What the app asks of the server

Nothing, unless the connection test is run (table above). These four checks are the only
requests in the app that skip the usual maintenance pre-check and sign-in header.

Even while the Welcome screen is showing, the 15-second background timer keeps checking whether
the server is reachable. So the maintenance or "can't reach Cartell" screen can take over here
too. See [07](07-maintenance-and-no-connection.md).

## When something goes wrong

| Situation | Result |
|---|---|
| A connection-test check times out or the network errors | That row keeps **spinning forever** instead of showing ✗ (Q33). Only a clean non-200 answer shows ✗. |
| **Open Debug Info** tapped in the first instant after the screen appears, before the version has been read | The tap fails silently, with an error report to Sentry. Tapping again a moment later works. |

## Odd but true

- **"Can Reach Spash Page"** has a typo ("Spash"). The React Native app keeps it (Q36).
- **The Open Debug Info button is lavender**, the stock style, unlike every other button (Q41).
- **Spacing uses physical pixels** (Q20). On a phone with 3× pixel density the gaps are three
  times larger, in on-screen terms, than on a 1× screen of the same physical height. The React
  Native copy reproduces this.
- **The environment switch is not remembered.** Closing and reopening the app returns to the
  server the build was made for (Q9).

## Related

- [03 Create an account](03-create-an-account.md) · [04 Log in](04-log-in.md)
- [29 Environments and test builds](29-environments-and-test-builds.md) for the server picker.
- [07 Maintenance](07-maintenance-and-no-connection.md)
