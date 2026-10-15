# 23 — Screen and State Catalogue (the screenshot checklist)

Plan steps: 1.2, 1.3, 1.5, every UI step's parity check, and 19.2. Each ID is captured from the
Flutter app (reference) and from the RN app (candidate) under the same conditions:

- device and OS
- text scale (1.0, about 1.5, 2.0)
- orientation (portrait, and landscape where reachable)
- width class (phone vs tablet wider than 800 px)

Store references as `react_native_app/docs/reference/<platform>/<ID>[_variant].png`, and videos
for motion items as `.mp4`.

How to reach each state is in the linked spec. Error states usually need a test server, an
offline device, or a mocked response.

## Global (G)

| ID | What | Spec |
|---|---|---|
| G01 | Launcher icon and name (Android launcher, iOS home screen), Recents/App Switcher entry | 01 |
| G02 | Launch splash: Android light mode, Android dark mode (Android 12+ system splash), iOS | 01 §2.3, §3.3 |
| G03 | EnvBanner on a non-LIVE build (top-right "TEST SERVER" etc.), also over dialogs | 02 §4 |
| G04 | Cross-fade between two bloc screens (300 ms), **video** | 06 §6 |
| G05 | Toasts: success (circleCheck), failure (error_outline), Cupertino check variant, info variant; **video** of fade and drag-to-close | 07 §6 |
| G06 | Teast top banner (Pair Sounder), **video** | 07 §6 |
| G07 | Liquid pull-to-refresh, **video** | 07 §11 |
| G08 | Popup dialog, one-button and two-button variants, with body (delete account) and with an empty title/message (Test Connection) | 07 §5 |
| G09 | Popup menu (kebab) open, with a red "Delete" item | 07 §9 |
| G10 | Keyboard open on every form screen (layout and scroll behaviour) | 18 §3 |
| G11 | Status bar and navigation bar on a screen with an app bar and one without | 18 §4 |

## Auth (A)

| ID | Screen / state | Spec |
|---|---|---|
| A01 | LoadScreen (SpinKitRing), **video** | 08 §1 |
| A02 | Welcome (note the physical-pixel spacing on two devices with different DPR) | 08 §2 |
| A03 | Debug menu sheet, info view (and in a `__DEV__` build with the extra buttons) | 08 §2 |
| A04 | Debug menu environment picker with the warning box, each option active | 02 §5 |
| A05 | Test Connection popup: spinners, then the results | 08 §2 |
| A06 | Login: empty | 08 §5 |
| A06a | Login: email and password errors | |
| A06b | Login: submitting (HUD, disabled button and back) | |
| A06c | Login: keyboard open (logo hidden) | |
| A06d | Login: password visible (eye toggled) | |
| A07 | Registration: empty | 08 §6 |
| A07a | Registration: invalid email | |
| A07b | Registration: password errors (multi-line) | |
| A07c | Registration: confirm field visible | |
| A07d | Registration: submitting | |
| A08 | Lock screen with no message | 08 §4 |
| A08a | Lock screen with the lockout message | |
| A09 | Maintenance (wrench) | 08 §7 |
| A09a | Unreachable (wifi) | |
| A09b | Retry pressed (disabled) | |
| A-D1 | Popup "Account Not Found" | 08 §5 |
| A-D2 | Popup "An Error Occured" (login) | |
| A-D3 | Popup "Unable to Create Account" (password mismatch) | 08 §6 |
| A-D4 | Popup registration server errors (multi-line `\n ` items) | |
| A-D5 | Popup "Something went wrong on our end…" | |
| A-D6 | Popup timeout (swapped title and message) | |
| A-D7 | Popup "Your account was created. Please login" (check_circle icon, swapped) | |
| A-D8 | Dialog "Unlock with biometrics?" (Cancel and Okay) | 08 §5 |
| A-D9 | Dialog "Log Out" | 08 §8 |
| A-D10 | Popup "Could Not Sign Out" | |
| A-OS1 | Biometric prompt: Android BiometricPrompt and iOS Face ID (text and buttons) | 03 §5 |
| A-OS2 | Password-manager save prompt after a successful login, and after registration | 08 §9 |
| A-OS3 | Autofill suggestion on the login fields | |

## Main shell and account (M)

| ID | Screen / state | Spec |
|---|---|---|
| M01 | Drawer open (phone) | 10 §1 |
| M01a | Drawer at big font (no email) | |
| M01b | Rail (tablet wider than 800 px) on several screens | |
| M01c | Drawer edge-swipe and scrim, **video** | |
| M02 | Account Settings skeleton | 11 §1 |
| M03 | Account Settings: Alexa off | 11 §2 |
| M03a | Account Settings: Alexa setting on with "Connected Services" and the amazon icon | |
| M03b | Account Settings: without the biometrics row | |
| M03c | Account Settings: Android vs iOS row padding | |
| M03d | Account Settings: no phone number (the `phoneNo!` crash, Q30) | |
| M03-M | Account kebab menu "Delete Account" | |
| M03-D1 | Delete Account dialog with the password field | 11 §2.1 |
| M03-D2 | "Account Successfully Removed" | |
| M04 | Edit name | 11 §3 |
| M05 | Edit phone: loading, loaded, error (FriendlyErrorView) | 11 §4 |
| M06 | Edit password: initial, errors (red), confirm visible, submitting | 11 §5 |
| M06-D | "Passwords Do Not Match", "Password Change Successful!", generic error popup | |
| M07 | Help (release build), and the `__DEV__` build with Hub Light Guide; with and without the Alexa button | 11 §6 |
| M08 | "Give Feedback" prompt (debug flag set) | 11 §9 |
| M08a | Feedback sheet (no face selected, a face selected, keyboard open) | |
| M08b | Feedback toasts | |
| M09 | Alexa cheat sheet: connected / not connected, with one info field expanded | 11 §7 |
| M10 | Hub light guide (`__DEV__`), **video** of all seven patterns | 11 §8 |
| M11 | All Event History: initial checking spinner, list, paging loader, pull-to-refresh, empty | 12 §2 |
| M11a | History card at scale 1.75 or more (column layout); landscape | 12 §1 |

## Hubs (D)

| ID | Screen / state | Spec |
|---|---|---|
| D01 | Hubs list: empty | 10 §2 |
| D01a | Hubs list: one hub connected, one disconnected, one blacklisted, one with a blacklisted sensor (badge) | |
| D01b | Hubs list: big font (max-width rules) | |
| D01-M | Ellipsis menu "Add Hub" | |
| D01-D | "Leave App" dialog (Android Back) | |
| D02 | Hub detail: checking / ready / failed; connected / disconnected | 10 §3 |
| D02a | Hub detail: flagged banner | |
| D02b | Hub detail: Open Gate enabled (integrator on and connected) | |
| D02c | Hub detail: Sensors badge | |
| D02-M | Hub kebab menu | |
| D02-D | "Delete Hub?" dialog over the open menu | |
| D02-T | Toast "Sent message to open gate" | |
| D03 | Hub settings (all switches; Pair Integrator visible; scrollbar) | 10 §4 |
| D03-T | Each switch's success and failure toasts | |
| D04 | About hub (versions present; versions null) | 10 §5 |
| D05 | Rename hub | 10 §6 |
| D06 | Hub history: list / loading / error with raw text | 12 §3 |

## Sensors (S)

| ID | Screen / state | Spec |
|---|---|---|
| S01 | Sensors list: 0 / 1 / several sensors; tablet padding | 13 §2 |
| S01a | Sensor card blacklisted (badge); onboard card | 13 §1 |
| S01-M | "Pair Sensor" menu | |
| S02 | Sensor detail, regular: battery checking / low / good | 13 §3 |
| S02a | Sensor detail, onboard (no battery, Pair Sounder) | |
| S02b | Sensor detail, flagged banner | |
| S02c | Sensor detail, Find Sensor vs Set Location | |
| S02-M | Sensor kebab menu | |
| S02-D | "Delete Sensor?" dialog | |
| S02-E | Map error popup | |
| S03 | About sensor | 13 §4 |
| S04 | Rename sensor | 13 §5 |
| S05 | Edit coordinates | 13 §6 |
| S05-D | "Coordinates Needed" and the four "Can't Get Location" popups | |
| S05-OS | Location permission prompt; location services off | |
| S06 | Sensor history | 12 §4 |
| S07 | Add sensor step 00 (counter 0/32) | 13 §7 |
| S08 | Add sensor step 01 | |
| S09 | Add sensor step 02: searching (counting), success, failure (generic), failure (hub not connected) | |

## Firmware (F)

| ID | Screen / state | Spec |
|---|---|---|
| F01 | Up to date, connected | 14 §2 |
| F01a | Up to date, offline | |
| F01b | One update; two updates | |
| F01c | Offline with an update (disabled + hint) | |
| F01d | Update running ("View progress") | |
| F01e | Big font (stacked cards) | |
| F01-D | "Update this hub?" dialog | |
| F02 | Progress: starting; in progress (ring, Elapsed, Remaining); success; failure with Try again and Reference | 14 §4 |
| F02-D | Error dialogs: Cannot start update / Sign in again / Lost contact | |

## Add hub (H)

| ID | Screen / state | Spec |
|---|---|---|
| H01 | Add hub initial (Submit disabled) | 15 §1 |
| H01a | MAC field editable (manual) and non-editable (scanned) | |
| H01b | Submit enabled; loading (RoundedLoader) | |
| H01-D | "Change Mac Address", "Failed to validate hub", "Adding Hub Failed" | 15 §2 |
| H02 | QR scanner: looking, valid, invalid ("Clear scan"); camera permission denied | 15 §3 |
| H03 | Hub added | 15 §4 |
| H04 | Add-hub init failure (Q14, broken FailureWidget) | 19 |

## Pairing (P)

| ID | Screen / state | Spec |
|---|---|---|
| P01 | Getting Your Hub Ready: countdown (**video**), then ready | 16 §7 |
| P02 | Plug in Hub; its help dialog | |
| P03 | Check the Light (**video** of the light); "Reset Your Hub?"; "Finding the Light" help | |
| P04 | Hold the Reset Button In: progress bar, then the button | |
| P05 | Connect to Your Hub: Wi-Fi on, Wi-Fi off (Android warning); help | |
| P06 | Connecting to HUB (Join vs Connect copy per platform); help | |
| P07 | Checking Connection to HUB | |
| P08 | Select WiFi Network: looking, none found, list | |
| P09 | Login To WiFi Network: normal, password visible, too-long error, debug extras | |
| P09-D | "Connect without a password?" | |
| P10 | Sending data to Hub | |
| P11 | Checking Hub's connection: each of the five reasons; elapsed at 59 s and 60 s; light readings panel | |
| P12 | Success (connected); Success (reconnected) | |
| P13 | Failure (each distinct copy: never reached, not verified, couldn't open connection, cancelled, socket errors) | |
| P14 | Session expired failure | |
| P15 | Pairing stopped | |
| P16 | Hub reverted | |
| P17 | Reconnecting to the server | |
| P18 | Wifi reconnect failed | |
| P-D1 | "Stop Pairing?" dialog | 16 §6 |
| P-OS1 | OS Wi-Fi join prompt: Android "Connect" picker, iOS "Join" alert | 16 §3 |
| P-OS2 | iOS local network permission prompt | 01 §3.1 |

## Notifications (N)

| ID | What | Spec |
|---|---|---|
| N01 | Foreground alert: Android heads-up, iOS banner | 09 |
| N01a | Second foreground alert replacing the first | |
| N02 | Background alert (tray, lock screen) | |
| N03 | Android app notification settings: two "Miscellaneous" channels | |
| N04 | Notification permission prompt (Android 13+, iOS) and when it appears | |
