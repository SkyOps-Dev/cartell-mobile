# Cartell React Native Port: Timeline

Work through the parts from 1 to 37 in order. A part only uses code from parts above it, with one
exception: Log in, App start and Log out get their push-token calls when part 14 (Push
notification setup) is done. When part 37 is done, the React Native app matches the Flutter app
and is ready to replace it in the stores.

Some screens have a button that opens a screen from a later part. That button shows a placeholder
until its part is built.

Day(s) = the working day(s) the part falls on, counting from day 1, for one developer with AI
writing the code and the developer testing on Android and iOS against the Flutter app. `1-2`
means the part starts on day 1 and finishes on day 2. Parts that share a day are done on the same
day.

| # | Part | What it covers | Day(s) |
|---|---|---|---|
| 1 | App shell, identity and environments | Empty RN app with the same ID, name, icon, splash, permissions; test/live/beta/dev servers; red "TEST SERVER" tag; a dev copy (`com.iwatllc.cartell.rn`) that installs next to the Flutter app | 1 |
| 2 | Logs and error reporting | Developer log format, Sentry setup, Android analytics | 1-2 |
| 3 | Saved data, data models and cache | Saving / reading / deleting login keys and settings on the phone; data models for hubs, sensors, events, user; shared in-memory copies | 2 |
| 4 | Talking to the server | Request rules, maintenance check, hub-network guard, staying signed in, 401 retry, every endpoint function | 3 |
| 5 | Shared look | Colours, text, buttons, fields, switches, popups, toasts, banners, spinners, pull-to-refresh, hub light | 4-5 |
| 6 | Navigation, screen frame, side menu and Back | State-machine navigation, top bar, side menu, tablet rail, screen cross-fade, Back on every screen | 5-6 |
| 7 | Create an account | Registration form, live email and password rules | 6 |
| 8 | Log in | Login form, Forgot Password, password manager save, biometric offer | 6 |
| 9 | Biometric unlock and lock screen | Fingerprint/Face ID prompt, lock screen, the on/off/never-asked setting | 7 |
| 10 | App start and automatic sign-in | Loading screen, auto-login with 3 attempts, landing on the right screen | 8 |
| 11 | Welcome screen and Debug Info | Welcome screen, version info, connection test, environment switch | 8 |
| 12 | Log out | Menu → Log Out, confirm, clear session | 8 |
| 13 | Maintenance and "can't reach Cartell" | Full-screen takeover when the server is down, Retry, sign-in again on recovery | 8 |
| 14 | Push notification setup | Firebase, notification permission, push token register / validate / delete; switches on the push-token calls in Log in, App start and Log out | 9 |
| 15 | Showing notifications | Alerts with the app open, in the background and closed; Android channels | 10 |
| 16 | Keep users signed in after the update | Read the login and settings the Flutter app saved, so users who update from Flutter stay signed in | 11 |
| 17 | Hub light guide | Blink-pattern guide screen (developer builds) | 11 |
| 18 | Alexa voice command guide | Alexa commands, linked status, skill link | 12 |
| 19 | Send feedback | Five-face feedback panel, "Give Feedback" prompt | 12-13 |
| 20 | Help screen | Version info, support / FAQ / About links, Feedback, Alexa, Hub light guide buttons | 13 |
| 21 | Account settings | Name / email / password / phone rows, notification, email and biometric switches, Alexa status | 14 |
| 22 | Edit name, phone and password | The three edit forms | 14 |
| 23 | Delete account | Password-confirmed account removal | 14 |
| 24 | Hubs list | Home screen with all hubs and their status | 15 |
| 25 | Hub details | Hub status and the six action buttons, Open Gate | 15 |
| 26 | Hub settings | Five switches per hub, Pair Integrator | 16 |
| 27 | Rename, About and Delete hub | The hub's ⋮ menu screens | 16 |
| 28 | Firmware updates | Current versions, update offers, live progress | 16-17 |
| 29 | Add a hub | Hub name and MAC (QR scan or typed), Hub Added screen | 17 |
| 30 | Connect hub to Wi-Fi (pairing) | Six-step wizard, joining the hub's Wi-Fi, talking to the hub, waiting for it to come online | 18-20 |
| 31 | Sensors list | One hub's sensors | 21 |
| 32 | Sensor details | Battery, Find Sensor on the map, alert switch, Pair Sounder | 21 |
| 33 | Sensor location, rename, about and delete | The sensor's ⋮ menu screens | 22 |
| 34 | Add a sensor | Three-screen sensor pairing wizard | 22-23 |
| 35 | Event history | All / one hub / one sensor history with paging | 24 |
| 36 | Platform behaviour pass | Every screen at large text, landscape, tablet, keyboard, links, dates, background / resume | 25 |
| 37 | Error reporting check | Sentry receives the same errors and codes as from the Flutter app; analytics | 26 |
| | **Done by** | | **Day 26** |
