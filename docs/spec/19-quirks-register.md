# 19 — Quirks Register (as-built behaviour to replicate or fix)

Plan steps: 0.1 (decision D13), and every step that touches the listed code.

**Default action for every row: replicate exactly.** "Indistinguishable" includes these
behaviours. Only the client can approve a fix. Record the decision and date in the last column.
A fixed row then becomes a deliberate, documented difference.

`frontend/FOLLOWUP_TODO.md` lists more review items. Some are already fixed in the code (for
example the `Device` fixture rename). Rows below are only behaviours confirmed present in the
2026-10-05 code.

| # | Area | As-built behaviour | Source | Decision |
|---|---|---|---|---|
| Q1 | Pairing help | "Contact support" in "Finding the Light on Your Hub" calls `popAndPushNamed('contact_us')`. There are no named routes, so it throws (sent to Sentry) and **only closes the dialog**. | `verifying_hub_state_widget.dart:93` | |
| Q2 | Account | Delete Account shows "Account Successfully Removed" **whatever the server response**, and local tokens are always cleared. A wrong password still "removes" the account locally (signs out). | `account_settings.dart:171`, `user_requests.dart:171` | |
| Q3 | Registration | The success popup has title and message swapped (title "Your account was created. Please login", message "Registration Succeeded"). The timeout popup is swapped too. | `attempt_registration_event.dart:76,128` | |
| Q4 | Registration | A network failure inside `register()` returns null, so `data.statusCode` throws an Error that the `on Exception` clause does not catch. **The spinner stays** until the maintenance or unreachable screen takes over. | `auth_requests.dart:130`, `attempt_registration_event.dart:61` | |
| Q5 | History | Event labels are always red (`Colors.red`), including "Connected". | `history.dart:275` | |
| Q6 | Edit name and phone | Submit does not await the PATCH and navigates to Account Settings immediately, which may show stale values. Errors are invisible. | `edit_name.dart:174`, `edit_phone.dart:159` | |
| Q7 | Hub settings | The Integrator-support failure toast says "Email notifications failed to turn …". | `device_settings_screen.dart:278` | |
| Q8 | Alexa | The "Last Event" description says "information on sensors with low battery". The info box says "will automatically be send". | `alexa_cheat_sheet.dart:109,131` | |
| Q9 | Debug menu | The environment switch is not persisted. "Change Environment" is hidden on LIVE builds because `isTestBuild` is computed at startup. | `constants.dart:112`, `debug_menu.dart` | |
| Q10 | Add sensor | No name validation. The old-sensor list fills asynchronously, so tapping Continue too early makes every existing sensor look "new", and the first one gets renamed. | `00_enter_name_for_add_sensor.dart:38` | |
| Q11 | Add sensor | System Back on step 02 leaves without disabling pairing mode on the hub. The Cancel button does disable it. | `02_sensor_connect_screen.dart:167` | |
| Q12 | Add hub | Submit with an empty field shows a toast and leaves the **loader spinning** (`isLoading` stays true). Unreachable from the enabled button. | `add_device_submit_event.dart:19` | |
| Q13 | Add hub | Submit re-runs `lastRanEvent`. After "Change Mac Address" was confirmed, submitting shows that dialog again. | `add_device_submit_event.dart:17` | |
| Q14 | Add hub | If `setProfile` fails on entry, the bloc pops the root route and pushes a `FailureWidget` that needs pairing providers, so the screen breaks (grey or red error screen). | `add_device_init_event.dart:13` | |
| Q15 | Add hub | The static `err` message persists across attempts, so a later 5xx can show an older 4xx message. | `add_device_bloc.dart:10` | |
| Q16 | Add hub | `validName` is never updated, so `canSubmit` is always false. Harmless, because the button uses its own rule. | `add_device_bloc.dart` | |
| Q17 | About sensor | Always shows `Sensor.png`, even for onboard sensors. | `sensor_meta.dart:93` | |
| Q18 | About hub | "Last Updated" shows `DateTime.now()` on every rebuild. Missing firmware versions display as "null". | `device_meta.dart:156,213` | |
| Q19 | Models | `Sensor.isBlacklisted` and `Device.shouldUseEmulatedSensor`, `location` and `addedDate` are not merged on refresh. Flags can go stale within a session (for example Open Gate enablement, the flagged-sensor banner). | `sensor.dart:42`, `device.dart:37` | |
| Q20 | Welcome and Debug | Spacing and sheet height come from **physical** pixel height, so the layout differs by device pixel ratio. | `welcome_screen.dart:59` | |
| Q21 | Notifications | Every foreground notification uses id 0, so a new one replaces the previous one. | `notifications.dart:43` | |
| Q22 | Notifications | Two Android channels are both named "Miscellaneous" (local `?` and the FCM fallback). | `notifications.dart:11` plus the manifest | |
| Q23 | Hubs | `fullLogin()` runs on every Hubs-list mount: a notification permission check plus an FCM token POST each time. | `devices_screen.dart:48` | |
| Q24 | History | Pull-to-refresh on All Events fires an extra `fetchDevices()` and hides the list behind the full loading scaffold. | `history.dart:93` | |
| Q25 | History | Hub history shows the **raw exception text** under a large orange icon on error. | `device_history.dart:179` | |
| Q26 | Edit password | Editing a valid new password into a different valid one keeps the old confirm text, which can produce "Passwords Do Not Match". | `edit_password.dart:289` | |
| Q27 | Many | Network failures inside widget callbacks (rename hub or sensor, delete hub, coordinates submit, edit name) throw with **no UI feedback** (Sentry only). | `edit_device.dart:27`, `edit_sensor.dart:48` | |
| Q28 | Alexa and Hub-light screens | **No PopScope**, so Android Back does nothing on them. | `alexa_cheat_sheet.dart`, `hub_lights.dart` | |
| Q29 | Help | The X button does `GoBackNStates(1)`, but Back and the arrow go to Hubs, so the two exits can differ. | `contact_us.dart:66,72` | |
| Q30 | Account settings | `phoneNo!` throws when the phone is null, breaking the screen for users without a phone number. | `account_settings.dart:406` | |
| Q31 | Firmware entry | A hub with a null `esp32_app_version` or `rfm6601_app_version` throws in the comparison, the bloc error hook fires, and the user is sent back to Hubs. | `go_to_device_firmware_updates_event.dart:46` | |
| Q32 | Feedback | The prompt flag defaults false and nothing sets it true outside debug, so in production the "Give Feedback" prompt never shows. The sheet's location string is hard-coded "Contact Us". | `user_feedback.dart:36,62` | |
| Q33 | Test Connection | A failed check (exception) spins forever instead of showing ✕. | `welcome_screen.dart:236` | |
| Q34 | ConditionalViewWidget | Re-requests `/app/settings/?code=alexa_enabled` on every rebuild. | `conditional_view_widget.dart:15` | |
| Q35 | Login | Two sources for the same "An Error Occured" spelling. Keep the typo. | `attempt_logging_in_event.dart` | |
| Q36 | Test Connection | The "Spash Page" typo. | `welcome_screen.dart:199` | |
| Q37 | Pairing | The Wi-Fi password screen uses the **default Material 3 underline** text field, unlike every other field in the app. | `view_wifi_network_widget.dart:122` | |
| Q38 | Pairing | `FailureWidget.firstTime` text is never shown (`firstTime` is always false). | `hub_connect_widget.dart:113` | |
| Q39 | Hub detail | Open Gate and Pair Sounder or Integrator show a success toast before the request completes. A failure is never shown. | `device_view.dart:353`, `sensor_view.dart:354` | |
| Q40 | Logging | `SHOULD_LOG = true`, but release builds filter to warnings and above. | `constants.dart:6`, `logging.dart:9` | |
| Q41 | Debug | The "Open Debug Info" button uses the Material default lavender style, the only lavender in the app. | `welcome_screen.dart:115` | |
| Q42 | Theme | Amber borders on every text field, `#0A0E21` scaffold, elevation 5 buttons, a 350-wide loader (DESIGN.md "as built" notes). | `constants.dart`, `rounded_loader.dart` | |
| Q43 | About sensor | "Date Paired" is formatted with `formatDateAndTime` **without `toLocal()`**, so a UTC timestamp from the server is shown as UTC clock time. Event history does convert to local time. (Found 2026-10-06 while writing `docs/features/`.) | `sensor_meta.dart:112`, `utilities/text_formatters.dart:15`, `models/sensor.dart:68` | |
| Q44 | Sentry | A comment in `main.dart` says events are tied to the user "via setUser()", but nothing ever calls `Sentry.configureScope`/`setUser`. Error reports carry no user identity; only feedback does. (Found 2026-10-06.) | `main.dart:55` | |
| Q45 | Add hub | The "Change Mac Address" popup has a single **Okay** and no Cancel; the only way out without unlocking the field is Android Back. (Found 2026-10-06.) | `add_device_warn_about_editing_event.dart:12` | |
| Q46 | EnvBanner | The "<ENV> SERVER" tag renders in a **monospace** font with a **yellow double underline**, because it sits outside any `Material` and inherits `MaterialApp`'s fallback error text style. (Found 2026-10-12.) | `env_banner.dart`, Flutter `widgets/app.dart:1731` | |
| Q47 | Login | **To verify on a device.** On Login the HUD sits inside `Center`: when **Log In** is tapped its `ModalBarrier` expands to the whole body and the Stack places the form at its top-start, so the form should **jump up** for as long as the spinner shows (Registration wraps `SafeArea` in the HUD and does not jump). Derived from the source 2026-10-12; confirm on the Flutter app before copying. | `login_screen.dart:110`, `modal_progress_hud_nsn-0.5.1` | |
| Q48 | Login, Registration | **Withdrawn 2026-10-12.** Said the back arrow was black; that came from reading the theme as `ColorScheme.dark()`. The scheme is the Material 3 dark baseline, so the arrow is `onPrimaryContainer` `#EADDFF` (pale lavender) and clearly visible, as the Flutter app shows. Not a quirk. | spec 07 §1, §3.1 | |
| Q49 | Auth screens | **Measured 2026-10-13 (RMX5070).** Switching auth screens (e.g. Log In → Welcome) does not visibly cross-fade: 50 ms after the tap the old screen is already gone and the new one is fading in from black, fully in by about 250 ms. `AnimatedSwitcher` reads as a cross-fade in the source; the cause is not identified. The RN switcher copies what is measured. | `auth_bloc_widget.dart:67`; RN `src/components/CrossFadeSwitcher.tsx` | |
| Q50 | Side menu | The menu shows the **first** user ever put in `DataPersistor<User>`, which nothing clears (not even log out). Log out and into a different account in the same app session and the menu still shows the first account's name and email until the app is restarted. (Found 2026-10-15, from the source.) | `navbar.dart:27`, `data_persistor.dart`, `json_parser.dart:73` | |
| Q51 | Hubs | "Leave" on the Leave App popup calls `SystemNavigator.pop` without closing the popup, so when the user comes back to the app the popup is still open. (Measured 2026-10-15, RMX5070.) | `devices_screen.dart:70` | |
| Q52 | Side menu | Android Back with the side menu open does not close it: the screen's PopScope(canPop: false) wins over the drawer's local history entry, so on Hubs "Leave App" opens over the open menu. (Measured 2026-10-15, RMX5070.) | `widgets/routes.dart` ModalRoute.popDisposition, `drawer.dart` | |

## How to use this table

- Before implementing a step, read the rows for its files.
- If the client approves a fix, implement it **after** parity is reached for that step, as a
  separate commit, and add a note in the step's checklist.
