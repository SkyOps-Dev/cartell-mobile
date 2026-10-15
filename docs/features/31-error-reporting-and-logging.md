# 31 — Error Reporting, Crash Reports and Logs

## In short

The app reports crashes, errors and slow-downs to **Sentry**, a third-party monitoring service, so
the team can see problems in the field. Almost every failed server request also files a report with
a short **error code** (e.g. `befba`), which tells the team exactly which request failed and why.
User feedback goes to Sentry too. Privacy settings keep personal details out: no IP addresses, and
screenshots attached to reports have all text and images blacked out. On Android, Firebase also
collects basic usage analytics automatically.

| | |
|---|---|
| **Who** | Invisible to users; used by the Cartell team |
| **Flutter source** | `main.dart` (Sentry set-up), `utilities/logging.dart`, every file under `services/requests/`, `screens/devices/connect_hub_to_wifi/**` (pairing reports), `components/user_feedback.dart`, `utilities/Exceptions/*` |
| **Detailed spec** | `docs/spec/03-foundation-services.md` §1–§3 · `04-networking-and-api.md` §5 · `16-hub-pairing.md` §8 |
| **Porting plan** | Phase 4 (4.1–4.3), Phase 17 |

## What Sentry receives

| Kind | When |
|---|---|
| **Crashes and uncaught errors** | Automatically, whenever something goes wrong that the code did not handle |
| **App hangs** | When the app freezes for too long |
| **Coded error reports** | When a server request fails (table below) |
| **Performance samples** | 20% of sessions in store builds (100% in developer builds) |
| **Breadcrumbs** | Short notes attached to later reports, mainly during hub pairing |
| **Pairing summaries** | One message each time the "waiting for the hub" stage ends ([11](11-connect-hub-to-wifi.md)) |
| **User feedback** | From the feedback panel ([26](26-feedback.md)) |

Each report is tagged with the environment (LIVE, TEST, BETA, DEVELOPMENT) and the app version
(`com.iwatllc.cartell@1.12.5+193`). Debug symbols are uploaded with each release so crash traces
are readable.

## Privacy protections

- **No personal data by default**: the user's IP address and the phone's name are not attached.
- **Screenshots** are attached to error reports, but **all text and all images are masked**, and the
  live camera view in the QR scanner is masked too.
- **Sign-in tokens and cookies** are replaced with "[Filtered]" in any request details attached to
  a report.
- Feedback deliberately includes the user's **name and email**, so the team can reply.
- **Error reports are not linked to a user account.** A comment in `main.dart` says events are tied
  to the signed-in user, but nothing in the code ever tells Sentry who the user is. Only feedback
  carries identity (Q44).

## Error codes

Each code is a fixed 5-character tag. They appear only in Sentry, never on screen, except the
pairing codes ([11](11-connect-hub-to-wifi.md)) and the firmware "Reference" number ([15](15-firmware-updates.md)).
The React Native app must keep every code identical so existing dashboards and support notes keep
working.

| Area | Codes and meaning |
|---|---|
| **Timeouts** (any request, 15 s) | `4f0ef` GET · `64773` POST · `a0af6` PATCH · `191d2` DELETE · `7928a` user-data GET |
| **Sign-in and session** | `11dd3` login request failed · `5c9f3` registration request failed · `675e0` token check request failed · `045c9` token renewal request failed · `66c58` both tokens rejected (session dead) |
| **Account** | `e6196` / `15955` loading the user (session / server) · `b323c` / `9eae2` loading the profile or a setting (session / server) · `418d4` / `68abd` saving name or phone · `8ba3d` / `aa1dc` saving the push-alert switch · `5e49a` / `f5e37` saving the email-alert switch · `7e945` changing password or deleting the account (session) · `38bcd` password change refused · `c5911` / `c34bc` / `855df` filling the edit-name / edit-phone forms · `4aec9` feedback panel could not load the user |
| **Push notifications** | `938dc` registering the push token failed |
| **Phone network** | `cbf7f` could not read the Wi-Fi name. Separate report "on a hub's network" outside pairing ([07](07-maintenance-and-no-connection.md)) |
| **Hubs** | `befba` loading the hub list · `a54db` / `e412a` loading one hub (session / server) · `70a42` health request refused · `791fa` adding a hub (session) · `cda7f` / `5486f` deleting a hub (session / server) · `c43be` / `80ae9` renaming a hub · `f7061` / `69f90` saving a hub switch (session / server) · `41ef1` onboard-sensor switch · `7466e` gate, integrator or sounder command refused · `205f8` "is the hub connected?" check failed |
| **Sensors** | `11ebc` / `04c7b` loading a hub's sensors · `c3f22` / `40b27` loading one sensor · `10a37` deleting, renaming, locating or switching a sensor |
| **Events** (note: "Error **Message**") | `4b6cf` / `59538` all events · `24b87` / `50748` hub events · `df3dc` / `0161e` sensor events |
| **Firmware** | `2a380` session failed while checking firmware · `d7562` loading the newest firmware or a running update · `03337` starting an update failed for an unexplained reason. Also any failure while watching progress, and "status unrecognised" messages. |
| **Unused code paths** | `c451d` (hub firmware query), `04808` / `b87e8` / `4e37b` / `5f65b` (locations): present in code, never triggered ([A4](A4-hidden-and-unused-features.md)) |

Pairing has its own codes, which the user sees: `762c844a-*`, `e5b1907d-*`, `9d5a3474`,
`8874c4b9`, `dbd39a14-b708`, `3b3cd169-f023`, `d63f9b07`, plus `15b12a` from Add Hub. See
[11](11-connect-hub-to-wifi.md) and [10](10-add-a-hub.md).

## Logs on the phone

The app writes a developer log (visible only with a cable and developer tools), one line per entry:
`MM/dd/yyyy HH:mm:ss.SSS - <area> - <LEVEL> - <message>`. Store builds only write warnings and
errors; developer builds write everything from "info" up. Nothing in the log is sent anywhere.

## Firebase Analytics (Android only)

The Android build includes Firebase Analytics, which automatically collects standard usage data
(app opens, sessions, device type). The app records no custom analytics events. The iOS build does
not include Analytics.

## Related

- [26 Feedback](26-feedback.md) · [11 Pairing codes](11-connect-hub-to-wifi.md) ·
  [A1 Server API](A1-server-api-reference.md)
