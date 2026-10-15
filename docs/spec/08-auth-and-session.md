# 08 — Auth and Session

Plan steps: 7.1–7.8. Sources: `screens/welcome/*`, `screens/misc/debug_menu.dart`,
`bloc/auth/**`, `services/auth_manager/check_creds.dart`, `services/biometric_service.dart`,
`screens/bloc_widgets/auth_bloc_widget.dart`, `utilities/AppWatchers/*`.

## 1. LoadScreen (`welcome/load_screen.dart`)

`Scaffold(appBar: AppBar(title: Center(wordmark h45), backgroundColor #25282A))`. Body:
`SafeArea → ResponsiveSpacer → Center → scroll Column[20, SpinKitRing(white), 20]`. Shown for
`IsLoadingAppState`, `IsLoadingMainAppState` and `IsLoadingDevicesScreenState`.

## 2. WelcomeScreen and Debug menu

### WelcomeScreen (`welcome/welcome_screen.dart`)

- Reads `PackageInfo` in `initState` (version, buildNumber, …).
- `screenHeight` = **physical** pixel height (spec 03 §7).
- `Scaffold` (no app bar) → `Center` → scroll → padding horizontal = width < 800 ? 10% of width
  : 20% → `Column(center, stretch)`:
  1. `SizedBox(h: screenHeight/18)`
  2. `SizedBox(h: screenHeight/15, wordmark contain)`
  3. `SizedBox(h: screenHeight/15)`
  4. RoundedButton 'Log In' (blue, title `#25282A`, FA arrowRightToBracket in `#25282A`) →
     `GoToLoginScreenEvent`
  5. RoundedButton 'Register' (amber, FA clipboardList) → `GoToRegistrationScreenEvent`
  6. `SizedBox(screenHeight/75)` twice
  7. `ElevatedButton("Open Debug Info")` (Material 3 default style, so lavender text on a
     surface-container background) → `showCupertinoModalPopup(DebugMenu(screenHeight, version!,
     buildNumber!))`. This throws if PackageInfo has not resolved yet.
  8. An empty `Column`

### DebugMenu (`misc/debug_menu.dart`)

`CupertinoPopupSurface → DefaultTextStyle(TextStyle()) → Container(#54585A, centred,
height = screenHeight × 0.30 (physical!))`, padding 8, `Column(min)`.

**Info view**:

- `ConstrainedBox(maxHeight 200)` holding three lines (20, height 1.25, centred,
  `selectionColor` black):
  - "Version: <v>"
  - "Build Number: <b>"
  - "Environment Name: <ENV>" (always shown, including LIVE)
- `SizedBox(30)`
- RoundedButton 'Test Connection' (amber, `#25282A` title, FA circleQuestion) →
  `showPopupMessage(title "", message "", body: TestConnectionWidget())`
- `__DEV__` only:
  - 'Verify Sentry Setup' (amber) → throws `Exception('This is a test exception')`
  - 'Reset Show Feedback' (amber) → `setShowFeedback(true)`
- `isTestBuild` only: 'Change Environment' (amber) → picker view
- 'Close' (blue) → pop

**TestConnectionWidget**: a box (max width 350, max height 500) with a scrolling column of four
rows. Each row has padding v5 and shows a FutureBuilder with a 30×30 spinner, then FA check or
FA xmark at 30, then 10, then the title (18):

| Title (verbatim) | Check |
|---|---|
| "Internet Access" | `GET https://google.com` → 200 |
| "Server Access" | `GET {B}/test/` → 200 |
| "Can Reach Spash Page" | `GET {B}` → 200 |
| "Can Post to Server" | `POST {B}/echo/` with JSON `{"msg":"this is a test"}` → 200 and echo `msg` matches |

Each check waits 1 s first and has a 15 s timeout. A thrown error leaves the spinner forever
(FutureBuilder with an error and no data shows the spinner branch).

**Picker view**: spec 02 §5.

- Title 'Switch Environment' (20, bold, white)
- 12, then a warning box: margin h16, padding 10, amber at 0.1 fill, amber at 0.3 border, radius
  8. It holds FA triangleExclamation (amber, 16), 8, and the text "Warning: When using Beta or
  Production environments, pairing new hubs to the server will not work." (12, amber, w500).
- 16, then the three options (layout in spec 02 and the source)
- 12, then RoundedButton 'Back' (blue)

## 3. Auto-login (`bloc/auth/events/auto_login_event.dart`)

1. Emit `IsLoadingAppState`.
2. `try { purgeLegacyCredentials() } catch { warn }` (its own guard).
3. No access token (null or empty) → `IsOnWelcomeScreenState`. Stop.
4. If `getBiometricsEnabled() == true`, call `BiometricService().authenticate('Unlock Cartell')`:
   - success → continue
   - unavailable → `setBiometricsEnabled(false)`, continue
   - lockedOut → `IsLockedState('Too many attempts. Use your password to sign in instead.')`.
     Stop.
   - failed → `IsLockedState()`. Stop.
5. Up to three attempts of `autoLoginMethodOnTheLoadScreen()` (spec 04 §7), stopping at the first
   success.
6. Failed → Welcome. Succeeded → `subBloc = MainAppBloc(parent)`, `devices = fetchDevices()`,
   then emit `IsOnDevicesScreenState(bloc, devices)`.
7. Any exception → log the error, then Welcome.

**When it runs**:

- At app start (AuthBloc constructor)
- From the LockScreen "Unlock" button
- Whenever the mode returns to NORMAL after the maintenance or unreachable screen (§7)
- When MainAppBloc or DevicesBloc error recovery finds the session dead

## 4. LockScreen (`welcome/lock_screen.dart`)

`Scaffold → SafeArea → Center → scroll → padding h40 → Column(center, stretch)`:

1. `SizedBox(h155, wordmark)`
2. 40, then FA fingerprint (48, `#A2AAAD`)
3. 20, then 'Cartell is locked' (20, white, centred)
4. If a message is set: 10, then the message (`#A2AAAD`, centred)
5. 40, then RoundedButton 'Unlock' (FA fingerprint, blue, `#25282A`) → `AutoLoginEvent`
6. 10, then `TextButton('Use password instead', amber)` → `GoToLoginScreenEvent`

## 5. Login

### Screen (`welcome/login_screen.dart`)

Parameters: `temporaryEmail`, `emailError`, `passwordError`, `isSubmitting`.

- The email field is pre-filled with `temporaryEmail` once, in `initState`.
- Back FAB (spec 07 §7) → `GoToWelcomeScreenEvent`, disabled while submitting.
- Body: `SafeArea → Center → ModalProgressHUD(inAsyncCall: isSubmitting) → scroll → padding h
  (width < 800 ? 10% : 20%) → AutofillGroup(onDisposeAction: cancel) → Column(center, stretch)`:
  1. **Only while the keyboard is hidden** (`viewInsets.bottom <= 0`): [90,
     `SizedBox(h155, wordmark)`, 65].
  2. Email field: email keyboard, autofill hint `username`, IME "next" (focuses password),
     decoration `kTextFieldDecoration` with hint 'Enter your email', error text 'Email field
     cannot be empty' when `emailError` and not dismissed. Typing dismisses the error.
  3. 24, then the password field: obscured with a toggle (suffix padding h5, IconButton FA
     eyeSlash / eye, white70, 18, tooltip 'Show password' / 'Hide password'), autofill hint
     `password`, IME "done" → submit, hint 'Enter your password', error 'Password field cannot
     be empty'.
  4. A row aligned end: `TextButton("Forgot Password", amber)` → `launchUrl('{B}/password_reset')`
     (in-app browser).
  5. 24, then RoundedButton 'Log In' (blue, FA arrowRightToBracket), `onPressed` null (grey)
     while submitting.
  6. 20, then a `Wrap(crossAxis centre)` of ["Don't have an account?", `TextButton("Create One
     Here", amber)` → `GoToRegistrationScreenEvent`].
- Submit re-arms both dismissed errors, then adds `AttemptLoggingInEvent(email, password)`. It
  is ignored while submitting.

### Event (`bloc/auth/events/attempt_logging_in_event.dart`)

1. Email or password empty → emit Login with the error flags and `temporaryEmail`. Stop. (No
   in-flight state.)
2. Emit `IsOnLoginScreenState(temporaryEmail: email, isSubmitting: true)`. The screen stays
   mounted.
3. `login()`:
   - 401 → emit Login(email) plus PopupError title "Account Not Found", message "Please check
     your credentials and try again."
   - Any other status ≥ 300 → emit Login(email) plus PopupError "An Error Occured" / "An error
     occured. Please try again. If problem persists, contact support"
4. Success:
   1. `TextInput.finishAutofillContext(shouldSave: true)` (the only autofill commit)
   2. `successfulLoginStartup` (store tokens, purge legacy credentials)
   3. `NotificationApi.init()` (not awaited)
   4. `getFCMToken()`
   5. `setUser()`
   6. Biometric offer: if the preference is null **and** biometrics are available, write
      `false`, then push `PopupDialog` titled "Unlock with biometrics?" with the message "Use
      your fingerprint or face to open Cartell instead of typing your password. You can change
      this later in Account Settings." Its onOkay sets `true`. Errors are swallowed.
   7. `MainAppBloc`, `fetchDevices`, emit `IsOnDevicesScreenState(email, password, bloc,
      devices)`.
5. Any thrown error (including a null response) → PopupError "An Error Occured" with the same
   message, plus Login(email).

## 6. Registration

### Screen (`welcome/registration_screen.dart`)

Parameters: `temporaryEmail`, `temporaryFirstName`, `temporaryLastName`, `temporaryPhone`,
`isSubmitting`.

- Back FAB as on Login. `ModalProgressHUD` wraps the whole body.
- `SafeArea → Center → scroll(padding 24) → maxWidth 500 → AutofillGroup(cancel on dispose) →
  Column(center, stretch)`:
  1. `SizedBox(h60, wordmark)`
  2. 24, then 'Create Account' (28, bold, white, centred)
  3. Padding 8, then "Create a new account to get started with your Cartell alert system!" (16,
     white, centred)
  4. 60, then a Row of two fields:
     - Expanded First Name: autofill `givenName`, white text, start-aligned, name keyboard,
       label 'First Name', prefix `Icons.person_outline` amber, hint 'First Name'
     - 16
     - Expanded Last Name: `familyName`, label and hint 'Last Name', **no prefix**
  5. 16, then Email: autofill `username`, email keyboard, white text, label 'Email', prefix
     `Icons.email_outlined` amber, hint 'Enter your email'. Validated on every change: invalid
     unless it contains "@" and "." and has length ≥ 5. When invalid, `error: Text("Please enter
     a valid email", #FF5252)` and `errorBorder` `#FF5252` 1 px radius 32.
  6. 16, then Password: autofill `newPassword`, obscured, label 'Password', prefix
     `Icons.lock_outline` amber, hint 'Enter your password', eye toggle (tooltip as on Login).
     Validated on every change, building the message by concatenation:
     - empty → "Password field cannot be empty\n" (and stop)
     - no `[A-Z]` → "Password must contain at least one uppercase letter\n"
     - no `[0-9]` → "Password must contain at least one number\n"
     - no character from `!@#$%^&*(),.?":{}|<>` → "Password must contain at least one special
       character\n"
     - length < 8 → "Password must be at least 8 characters long\n"

     Invalid → red error text and border, **clear the confirm field and hide it**. Valid →
     show the confirm field.
  7. If confirm is visible: 16, then Confirm Password: `newPassword`, obscured, label 'Confirm
     Password', lock prefix, hint 'Re-enter your password', own eye toggle.
  8. 16, then Phone: autofill `telephoneNumber`, phone keyboard, label 'Phone Number', prefix
     `Icons.phone_outlined` amber, hint 'Enter your phone number'.
  9. 32, then RoundedButton 'Register' (blue), null while submitting →
     `AttemptRegistrationEvent(email, pwd, confirm, first, last, phone, no-op callbacks)`
  10. 12, then a centred Wrap of ["Already have an account?", `TextButton("Login Here", amber)`
      → `GoToLoginScreenEvent`].

### Event (`bloc/auth/events/attempt_registration_event.dart`)

1. Emit Registration(fields, `isSubmitting: true`).
2. Password ≠ confirm → PopupError title "Unable to Create Account", message "Passwords do not
   match. Please re-enter them and try again." Emit Registration(fields).
3. `register()`:
   - **201** → `finishAutofillContext(shouldSave: true)`, then `PopupNotification(message:
     "Registration Succeeded", title: "Your account was created. Please login", icon:
     Icons.check_circle)`. **The title and message are swapped as built**, so the title line
     reads "Your account was created. Please login". Then emit Login(email).
   - **300–499** → `buildErrorMessage(json)`: the first present key of email, password,
     first_name, last_name or phone_no. Each item is appended as `"\n " + item`; with no known
     key, "An error occurred. Please try again.". PopupError title "Unable to Create Account".
     Emit Registration(fields).
   - **Anything else** → PopupError "Unable to Create Account" / "Something went wrong on our
     end. Please try again in a moment." Emit Registration(fields).
4. `on Exception` → the `showErrorMessage` callback (a no-op), then PopupError with **message
   "An Error Occured" and title "Request timed out. Check your internet connection, and then
   try again."** (swapped), then Registration(fields).
5. A null response (network failure inside `register()`) raises an Error that is not caught, so
   the spinner sticks. See spec 19.

## 7. Maintenance and unreachable (`auth_bloc_widget.dart`, `maintenance_mode_screen.dart`)

- `updateMode(mode)` → `ModeDebouncer.consider(mode)`. On hold, do nothing. Otherwise:
  - MAINTENANCE → `MaintenanceModeEvent(isUnreachable: false)`
  - UNREACHABLE → `MaintenanceModeEvent(true)`
  - NORMAL → **`AutoLoginEvent`**, which re-runs the whole auto-login, including the biometric
    prompt and the hub health queries.
- `MaintenanceModeScreen(isUnreachable)`:
  - `AppBar(Center(wordmark h45), #25282A)`; `SafeArea → ResponsiveSpacer → Center → scroll
    Column(center)`.
  - Icon 100: FA wifi when unreachable, FA wrench otherwise.
  - 20, then the message (20, centred, padding h30):
    - unreachable: "We can't reach Cartell right now.\nCheck your internet connection and try
      again."
    - maintenance: "The server is currently undergoing an update. Please check back later."
  - 12, then `TextButton('Retry')` (disabled while retrying) → `validateServerMode()` →
    `notifyListeners(mode)`.
- Triggers: any request's probe, the 15 s background timer, and the Retry button. Probing only
  happens while the app is resumed and not pairing.

## 8. Logout (`bloc/auth/events/attempt_log_out_event.dart`)

From the NavBar "Log Out" → `AttemptLogOutEvent()` → `PopupDialog(title "Log Out", message "Are
you sure you want to log out?")`, which has Cancel and Okay. On Okay:

1. Read the FCM token (a failure counts as null).
2. Token present → `DELETE /notifications/register_device/ {token}`.
3. `FirebaseMessaging.instance.deleteToken()`. Errors in steps 2–3 are logged and ignored.
4. Delete the refresh token, then the access token. On failure → PopupError "Could Not Sign Out"
   / "Your session could not be cleared. Please try again." Stop.
5. Best effort: delete the FCM token, purge legacy credentials, delete the biometric preference.
6. `add(AttemptLogOutEvent(shouldLogOut: true))` → emit Welcome.

PopupDialog rendering pops the dialog after `onOkay()` (spec 06 §6).

## 9. Autofill and password managers

- Login: one `AutofillGroup` (cancel on dispose) wraps the email (`username`) and password
  (`password`) fields. Registration: identity fields plus `newPassword` (both password fields).
- The only commits are `finishAutofillContext(shouldSave: true)`, on login success and on a 201
  registration. A failure never saves. Leaving the screen cancels.
- iOS associated domains: `webcredentials:` for the three hosts (spec 01). This cannot be tested
  on the simulator (`frontend/CLAUDE.md`).
- The Wi-Fi password field explicitly opts out of autofill: `autofillHints: []`, no suggestions,
  no autocorrect.

## 10. Notification permission timing

`NotificationApi.init()` requests notification permission when it is denied or limited. It is
called by the login success path, `autoLoginMethodOnTheLoadScreen`, `validateFCMToken`, and
`fullLogin()` (on every `DevicesScreen` mount). Spec 09.
