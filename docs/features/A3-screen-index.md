# A3 — Screen Index

Every screen and overlay in the app, how to reach it, and the page that describes it. Use it as a
checklist: if a screen is not here, it is not reachable in the app (see
[A4](A4-hidden-and-unused-features.md) for the unreachable ones). For screenshot IDs, see
`docs/spec/23-screen-catalogue.md`.

**Menu?** = the screen has the ☰ side menu (or the permanent rail on wide screens).

## Signed-out and system screens

| Screen | How to reach | Menu? | Page |
|---|---|---|---|
| Loading | App start; automatic sign-in; any "must load first" step | no | [01](01-app-start-and-automatic-sign-in.md) |
| Welcome | Signed out; log out; delete account; ← on Login/Registration | no | [02](02-welcome-screen-and-debug-info.md) |
| Debug Info panel | Welcome → Open Debug Info | — | [02](02-welcome-screen-and-debug-info.md) |
| Test Connection popup | Debug Info → Test Connection | — | [02](02-welcome-screen-and-debug-info.md) |
| Switch Environment panel | Debug Info → Change Environment (non-production builds) | — | [29](29-environments-and-test-builds.md) |
| Login | Welcome → Log In; Registration → Login Here; after registering; Lock → Use password instead | no | [04](04-log-in.md) |
| Registration | Welcome → Register; Login → Create One Here | no | [03](03-create-an-account.md) |
| Lock screen | Start-up with biometric unlock on, when the check fails | no | [05](05-biometric-unlock.md) |
| Maintenance (wrench) | Server answers but is unavailable | no | [07](07-maintenance-and-no-connection.md) |
| Can't reach Cartell (Wi-Fi) | Server cannot be reached | no | [07](07-maintenance-and-no-connection.md) |

## Main area

| Screen | How to reach | Menu? | Page |
|---|---|---|---|
| Hubs list (home) | After sign-in; menu → HUBs | yes | [09](09-hubs-list.md) |
| Account Settings (skeleton, then loaded) | Menu → Account Settings | yes | [22](22-account-settings.md) |
| Edit name | Account Settings → Name | yes | [23](23-edit-name-phone-and-password.md) |
| Edit phone | Account Settings → Phone | yes | [23](23-edit-name-phone-and-password.md) |
| Change password | Account Settings → Password | yes | [23](23-edit-name-phone-and-password.md) |
| Delete Account popups | Account Settings → ⋮ → Delete Account | — | [24](24-delete-account.md) |
| All Event History | Menu → Event History | yes | [21](21-event-history.md) |
| Help | Menu → Help; flagged sensor → Contact Support | yes | [25](25-help-screen.md) |
| Feedback panel | Help → Send Feedback; "Give Feedback" prompt → Sure! | — | [26](26-feedback.md) |
| Alexa Voice Command Guide | Help → Alexa Voice Commands (if enabled) | yes | [27](27-alexa-voice-commands.md) |
| Hub Light Guide | Help → Hub Light Guide (developer builds) | yes | [28](28-hub-light-guide.md) |

## Hubs

| Screen | How to reach | Menu? | Page |
|---|---|---|---|
| Add hub | Hubs list → + or ⋮ → Add Hub | yes | [10](10-add-a-hub.md) |
| QR scanner | Add hub → Tap To Scan QR Code | no (own top bar) | [10](10-add-a-hub.md) |
| Hub Added to Account! | Successful add | no | [10](10-add-a-hub.md) |
| Hub details | Hubs list → tap a hub | yes | [12](12-hub-details.md) |
| Hub settings | Hub details → Hub Settings | yes | [13](13-hub-settings.md) |
| Rename hub | Hub details → ⋮ → Rename Hub | yes | [14](14-rename-about-and-delete-a-hub.md) |
| About hub | Hub details → ⋮ → About | yes | [14](14-rename-about-and-delete-a-hub.md) |
| Delete Hub? popup | Hub details → ⋮ → Delete Hub | — | [14](14-rename-about-and-delete-a-hub.md) |
| Hub history | Hub details → History | yes | [21](21-event-history.md) |
| Firmware updates | Hub details → Firmware Updates, or ⋮ → Check for updates | yes | [15](15-firmware-updates.md) |
| Firmware progress | Firmware → Update now → Update, or View progress | no | [15](15-firmware-updates.md) |

## Hub Wi-Fi pairing (all without the menu)

Reached from Hub Added → Proceed and Pair To Wi-Fi, or Hub details → Connect HUB. All described in
[11](11-connect-hub-to-wifi.md).

| # | Screen title | Step |
|---|---|---|
| 1 | Getting Your Hub Ready | 1 of 6 |
| 2 | Plug in Hub | 2 of 6 |
| 3 | Check the Light on Your Hub | 3 of 6 |
| 4 | Hold the Reset Button In | — |
| 5 | Connect to Your Hub | 4 of 6 |
| 6 | Connecting to HUB | 4 of 6 |
| 7 | Checking Connection to HUB | 4 of 6 |
| 8 | Select WiFi Network | 5 of 6 |
| 9 | Login To WiFi Network | 6 of 6 |
| 10 | Sending data to Hub | 6 of 6 |
| 11 | Checking Hub's connection... | 6 of 6 |
| 12 | Hub has successfully connected to the network. | — |
| 13 | Pairing stopped | — |
| 14 | Your hub could not join that network | — |
| 15 | Failure (error message + code) | — |
| 16 | Session expired (a failure screen) | — |
| 17 | Reconnecting to the server | — |
| 18 | Please verify your network connection and try again | — |
| 19 | Successfully reconnected to the server. | — |

## Sensors

| Screen | How to reach | Menu? | Page |
|---|---|---|---|
| Sensors list | Hub details → Sensors | yes | [16](16-sensors-list.md) |
| Add a sensor (name) | Sensors list → + or ⋮ → Pair Sensor | yes | [17](17-add-a-sensor.md) |
| Prepare to add | Add a sensor → Continue | yes | [17](17-add-a-sensor.md) |
| Searching / connected / failed | Prepare to add → I see the red button! | yes | [17](17-add-a-sensor.md) |
| Sensor details | Sensors list → tap a sensor | yes | [18](18-sensor-details.md) |
| Edit coordinates | Sensor details → ⋮ → Edit Coordinates, or Set Location | yes | [19](19-sensor-location-rename-about-delete.md) |
| Rename sensor | Sensor details → ⋮ → Rename Sensor | yes | [19](19-sensor-location-rename-about-delete.md) |
| About sensor | Sensor details → ⋮ → About, or About button | yes | [19](19-sensor-location-rename-about-delete.md) |
| Delete Sensor? popup | Sensor details → ⋮ → Delete Sensor | — | [19](19-sensor-location-rename-about-delete.md) |
| Sensor history | Sensor details → View History | yes | [21](21-event-history.md) |

## Outside the app

| What | Opened from | Page |
|---|---|---|
| Password reset web page | Login → Forgot Password | [04](04-log-in.md) |
| Support, FAQ, About Us web pages | Help | [25](25-help-screen.md) |
| Amazon skill page | Alexa guide → Link to Cartell Skill | [27](27-alexa-voice-commands.md) |
| Maps app | Sensor details → Find Sensor | [18](18-sensor-details.md) |
| System prompts (permissions, biometrics, Wi-Fi join, password save) | various | [32](32-permissions-and-platform-behaviour.md) |
| System notifications | Server alerts | [20](20-notifications.md) |

**Totals:** 10 signed-out/system screens and panels, 11 main-area screens and panels, 11 hub
screens, 19 pairing screens and 10 sensor screens, plus popups.
