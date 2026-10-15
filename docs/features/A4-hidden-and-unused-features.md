# A4 — Hidden, Unfinished and Unused Features

Things that exist in the Flutter code but that a normal user of the store app **cannot reach or
see**. They are listed so nobody mistakes them for live features, or misses them when checking
completeness. The porting decision for each is in `docs/spec/22-file-coverage-matrix.md` and
decision D11 of `PORTING_PLAN.md`. Default: unreachable screens are not rebuilt; developer-only
features are.

## Developer-only (present in developer builds, absent from store builds)

| Feature | Where | Page |
|---|---|---|
| **Verify Sentry Setup** button (deliberately throws a test error) | Debug Info panel | [02](02-welcome-screen-and-debug-info.md) |
| **Reset Show Feedback** button (re-enables the feedback prompt) | Debug Info panel | [26](26-feedback.md) |
| **Hub Light Guide** screen | Help | [28](28-hub-light-guide.md) |
| **Scan QR Code Password - Debug Only** and the signal strength in dB | Pairing step 6 | [11](11-connect-hub-to-wifi.md) |
| Two extra pairing checks (read and compare the hub's stored server address) | Pairing verification | [11](11-connect-hub-to-wifi.md) |
| Per-navigation timing logs | Developer log | [31](31-error-reporting-and-logging.md) |

## Test-build-only (present in test, beta and development builds, absent from Live)

| Feature | Page |
|---|---|
| Red "<ENV> SERVER" tag | [29](29-environments-and-test-builds.md) |
| **Change Environment** server picker | [29](29-environments-and-test-builds.md) |

## Reachable in code but switched off for users

| Feature | Why users never see it | Page |
|---|---|---|
| "Give Feedback" prompt after pairing and firmware updates | Its flag starts off and only a developer button turns it on (Q32) | [26](26-feedback.md) |
| "Your Hub is added to your account. To connect, tap Return..." line on pairing failures | Only shown on a first-time path that is never used (Q38) | [11](11-connect-hub-to-wifi.md) |
| Second **Delete Account** button at the bottom of Account Settings | Permanently hidden | [24](24-delete-account.md) |
| "First Name cannot be empty" / "Last Name cannot be empty" | Their switches are fixed to off | [23](23-edit-name-phone-and-password.md) |
| Hub validity check before adding (`POST /produced-devices/validate-produced-device/`) | Commented out, waiting for a server change | [10](10-add-a-hub.md) |
| Firmware status codes 4, 6–12, 100 and −1 with messages like "Failure! Code: 2f088a11" | The server only ever reports four statuses | [15](15-firmware-updates.md) |

## Screens no one can open

| Screen | What it would do | Notes |
|---|---|---|
| **Share Account** (`screens/misc/invite_shared_user.dart`) | "Please enter the email address of the user that you would like to add to the account. Once the user accepts the invite, they will be able to access the account." with an Email field and Submit | **Unfinished**: Submit only writes "clicked" to the log. Nothing links to it. `frontend/PRODUCT.md` lists shared users as a capability, but the app has no working way to invite one. |
| **Add Location** (`screens/misc/add_location.dart`) | "Enter Location Information." with Location Name and Address fields, Submit (`POST /locations/`) and Return | Nothing links to it. Every account appears to have one location, used silently by Add Hub. |

## Unfinished or abandoned pieces

| Piece | Notes |
|---|---|
| **Relay on-time slider** in Hub settings ("Relay On Time:", 1–12, "Save Relay On Time") | Fully commented out, with its server call (`message/set_relay_on_time/`) |
| **Live firmware progress over a WebSocket** | Started and abandoned. A connection field is declared but never used; a list of WebSocket close codes has no users. Progress is checked once a second over normal requests instead. |
| **Hub firmware query** (`message/get_firmwares/`) | Commented out where it was called |
| **Edit location** (`PATCH /locations/{id}/`) | Request helper with no caller |
| **Hub-network guard switch-off** | A function to disable the "on a hub's Wi-Fi" guard exists but is never called |

## Unused building blocks

Present but not drawn anywhere: a "scalable" toggle-button widget, an icon-with-label widget, an
older top-bar widget, the light-blue "info" toast and banner styles, a "hide MAC address" action in
Add Hub, several old confirmation popups ("Error scanning QR code.", "Notification Settings" /
"Your notification settings have been updated", "Email Notification Settings" / "...updated.",
"Onboard Sensor Settings"), a helper that loads the user by another route, a "mobile size" check,
and two icon constants.

Hub messages defined but never sent in the shipping flow: reset device, query Wi-Fi test result,
test SSID and password, and the unencrypted "save" and "check and save" Wi-Fi messages. Only the
**encrypted** "check and save" message is used.

## Packages and files bundled but unused

- Packages: Firebase Auth, Cloud Firestore, geocoding, showcaseview, flutter_dotenv (a `.env` file
  is loaded at start-up but nothing reads it).
- Images: `Product-Cluster-no-cable-trans.png`, `cartellbox1.jpg`, `cartelldigitalcolor.png`,
  `cartellwhite.png`, `favicondigital.png`, `icon-1*.png`, `icon-1.ai`, `logo.png`. Only five images
  are shown in the app: the logo, the hub photo, the sensor photo, the onboard probe photo and the
  avatar.
- Android: an unused `google-services-old.json` and a template launcher background.

## Related

- [A3 Screen index](A3-screen-index.md) · `docs/spec/19-quirks-register.md` ·
  `docs/spec/22-file-coverage-matrix.md`
