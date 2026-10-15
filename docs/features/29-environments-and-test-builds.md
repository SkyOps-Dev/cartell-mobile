# 29 — Environments and Test Builds

## In short

The same app can be built to talk to different Cartell servers: **production** (real customers),
**test**, **beta**, or a developer's own computer. Which one is chosen when the app is built. Any
non-production build shows a small red tag such as **"TEST SERVER"** in the top-right corner of
every screen, so testers always know where their data is going. Non-production builds can also
switch server from the Debug Info panel, until the app is closed.

| | |
|---|---|
| **Who** | Testers, developers, support |
| **Flutter source** | `utilities/constants.dart`, `components/env_banner.dart`, `screens/misc/debug_menu.dart`, `main.dart`, `frontend/envs/*.json` |
| **Detailed spec** | `docs/spec/02-config-and-environments.md` · `21-release-and-tooling.md` |
| **Porting plan** | Phase 3 (3.5), Phase 7 (7.1), Phase 18 |

## The environments

| Build | Server | Secure (HTTPS) | Tag shown |
|---|---|---|---|
| **Live** (store) | `cartellap.com` | yes | none |
| **Test** | `test.cartellap.com` | yes | "TEST SERVER" |
| **Beta** | `beta.cartellap.com` | yes | "BETA SERVER" |
| **Development** | a developer's computer on the local network, e.g. `192.168.x.x:8000` | no | "DEVELOPMENT SERVER" |
| **Simulator** | `localhost:8000`, with all Wi-Fi switching during pairing turned off | no | "DEVELOPMENT SERVER" |

Each build also carries:

- the **Sentry** project key (crash reports, see [31](31-error-reporting-and-logging.md)),
- the secret key used to hash hub MAC addresses (see [10](10-add-a-hub.md)). It differs between
  live and test builds, which is how the release tools prove a build points at the right server,
- the hub's local address and ports for pairing (`192.168.4.1`, `5002` / `6452`).

## The red tag

- A small red box (85% opaque) in the **top-right corner**, inside the safe area, with white bold
  text "<NAME> SERVER".
- Drawn above everything, including popups, and it never blocks taps.
- Hidden on Live builds. It follows the debug-menu switch (below) immediately.

## Switching server (non-production builds only)

Welcome → **Open Debug Info** → **Change Environment**. The panel shows:

- **"Switch Environment"** (bold)
- An amber warning: "Warning: When using Beta or Production environments, pairing new hubs to the
  server will not work."
- Three choices, each a rounded box with a radio-button icon, the name and the address. The current
  one is highlighted blue with a ✓:
  - **Beta** — `beta.cartellap.com`
  - **Test** — `test.cartellap.com`
  - **Production** — `cartellap.com`
- **Back** (blue) returns to the info view.

Choosing one immediately:

1. switches the app's server address (always HTTPS),
2. changes the environment name (and the red tag; choosing Production hides it),
3. deletes the stored push token for the new environment,
4. returns to the info view, which now shows the new "Environment Name".

The user is then on the Welcome screen of the new server and must log in there. Each environment
keeps its **own** sign-in and settings on the phone, so switching back finds the earlier ones again.

## Odd but true

- **Q9**: the switch is not saved. Closing the app returns to the server the build was made for.
- **Q9**: the **Change Environment** button is decided at start-up. After switching a test build to
  Production, the button stays available; a store build never has it.
- The Debug Info panel's "Environment Name" line is shown on **all** builds, including Live.

## Related

- [02 Welcome and Debug Info](02-welcome-screen-and-debug-info.md) · [A2 Data on the phone](A2-data-kept-on-the-phone.md) ·
  [31 Error reporting](31-error-reporting-and-logging.md)
