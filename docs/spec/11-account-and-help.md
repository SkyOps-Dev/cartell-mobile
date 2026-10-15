# 11 — Account, Help, Alexa, Hub Lights, Feedback

Plan steps: 10.1–10.4. Sources: `screens/account/*`, `screens/misc/contact_us.dart`,
`alexa_cheat_sheet.dart`, `hub_lights.dart`, `components/user_feedback.dart`,
`components/conditional_view_widget.dart`, `services/requests/settings_requests.dart`.

## 1. Account settings skeleton (`AccountSettingsSkeleton`)

`AppScaffold → Expanded → SafeArea → padding h20 → Column(stretch)`:

1. Padding v20 → 'Account Settings' (20, centred)
2. Four skeleton rows, each with padding v15: a 20×20 box (`#54585A`, radius 4), 20, then an
   expanded 14-tall box (`#54585A`, radius 4)
3. `Spacer`
4. Padding bottom 25 → centred 24×24 CircularProgressIndicator (stroke 2, blue)

## 2. Account settings (`AccountSettings(user, profile)`)

- `initState` loads the biometrics row: `available = isAvailable()`, `enabled =
  getBiometricsEnabled() ?? false`. On error, `couldNotRead = true`. The row shows when
  `available || enabled || couldNotRead`.
- Actions: kebab → `ListTile(FA userXmark, 'Delete Account')` → Delete flow (§2.1).
- `PopScope(canPop: true)` with `onPop` → `GoToHubsScreenEvent`.
- Body: `Expanded → SafeArea → scroll → Column`:
  1. Padding `fromLTRB(10,25,30,0)`, Row(spaceBetween):
     - IconButton FA arrowLeftLong → `GoToHubsScreenEvent`
     - `ConditionalViewWidget(getSetting('alexa_enabled').value)` showing Row["Connected
       Services: ", FA amazon if `profile.alexaEnabled`]
  2. Padding h10 → main:
     - Padding `fromLTRB(15,0,15,35)` → `IconButton(FA userGear, blue, size 50, no-op)`
     - Padding 15 → 'Account Settings' (20, bold, amber)
     - Padding h2 → Column of `ReusableListing` rows (icon blue, size 20, font 14). Between rows,
       `Divider(thickness 2, amber)` with padding v14; the last divider before the switches has
       padding v10.

       | Label | Icon | Value | Tap |
       |---|---|---|---|
       | 'Name' | FA user | "first last" | `GoToAccountSettingsEditNameScreenEvent(user)` |
       | 'Email' | FA envelope | email | none |
       | 'Password' | FA lock | 'Change' | `GoToAccountSettingsEditPasswordScreenEvent` |
       | 'Phone' | FA phone | `formatPhoneNumber(user.phoneNo!) ?? 'Enter Phone Number'` | `GoToAccountSettingsEditPhoneNumberScreenEvent` (`phoneNo!` throws on null) |

     - If the biometrics row is shown: padding h (**iOS 0, Android 20**) → Row(spaceBetween)
       ["Unlock with Biometrics: " (14 white), AutoSwitch(controller)]. On tap,
       `setBiometricsEnabled(v)`:
       - success: "Cartell will ask for your fingerprint or face when it opens." /
         "Biometric unlock turned off."
       - write error: "Could not save that setting. Please try again."

       Then a Divider (2, amber, padding v5).
     - "Receive Notifications: " row (same padding rule): AutoSwitch
       (`profile.shouldSendNotification`) → `PATCH /profiles/me/`. Success: "Notifications
       turned on/off." Failure: "Error encountered of type: <Type>. Notifications are still
       <opposite>. Please try again soon." Divider.
     - "Receive Email Notifications: " row: AutoSwitch(`user.shouldSendEmails`) → `PATCH
       /auth/users/me/`. Success: "Email notifications turned on/off." Failure: "Error
       encountered of type: <Type>. Email notifications are still <opposite>. Please try again
       soon." Divider.
     - A hidden (`Visibility(false)`) 'Delete Account' button.

### 2.1 Delete Account flow

1. `Navigator.pop` closes the menu.
2. Popup "Delete Account", `showCancel`, message "You are about to delete your account. Possible
   data loss can occur. If you are sure that you want to delete your account, please enter your
   password." with a body TextField (obscured, `kTextFieldDecoration`, hint 'Enter your
   password'). The okay label is "Delete".
3. On Delete: `deleteAccount(password)`. **The response status is ignored and local tokens are
   cleared regardless.** Then, on top of the delete dialog, popup "Account Successfully Removed"
   / "Your account has been removed.". Its okay pops it, then `GoToWelcomeScreenEvent`, then pops
   the delete dialog.
4. Unused helpers exist: update-notification popups ("Notification Settings" / "Your
   notification settings have been updated.", "Email Notification Settings" / "Your email
   notification settings have been updated."). They are dead code and not ported.

## 3. Edit name (`EditName(user)`)

- Actions: X → `GoToAccountSettingsScreen`. `PopScope(canPop: false)` Back does the same.
- `Expanded → SafeArea → LayoutBuilder → scroll → Column`:
  1. Padding `fromLTRB(10,25,0,0)` back arrow → `GoToAccountSettingsScreen`
  2. Centred `CircleAvatar(r50, avatar.png)` with padding `fromLTRB(15,0,15,20)`
  3. 'Account Settings' (20, amber, bold, maxLines 2, fade, padding v20)
  4. Padding h (width > 500 ? 15% : 15):
     - 'Enter Your Name.' (14, bold, padding left 10)
     - 25, then the First Name field (label 'First Name')
     - 25, then the Last Name field (label 'Last Name')
     - Padding v10, then RoundedButton 'Submit' (blue, FA circleCheck) →
       `updateUserData({first_name, last_name})` (**not awaited**) **and immediately**
       `GoToAccountSettingsScreen`
- The `errorText` flags are hard-coded false, so errors never show.

## 4. Edit phone (`EditPhone(user)`)

- The same chrome. `futureUser = setUser()`; `setData()` also calls `setUser()` and pre-fills
  `phone_no` (a server round trip; Sentry `c34bc` on error).
- `FutureBuilder`:
  - Data: back arrow; avatar r50 (padding `fromLTRB(15,10,15,20)`) and 'Account Settings' inside
    padding v25; padding h(15%/15) → 'Enter Your Phone Number.' (14 bold), 25, TextField (label
    'Phone Number', default keyboard), 25, RoundedButton 'Submit' (blue, FA circleCheck) →
    `updateUserData({phone_no})` (not awaited) + `GoToAccountSettingsScreen`.
  - Error: Sentry `NoAccountInformationFoundException("Error Code 855df:")` + padding 50 →
    `FriendlyErrorView`.
  - Loading: a centred spinner.

## 5. Edit password (`EditPassword(user, setPassword)`)

- Actions: X (disabled while submitting) → `GoToAccountSettingsScreen`. `PopScope(canPop:
  false)`: Back is ignored while submitting, else the same.
- `ModalProgressHUD(inAsyncCall: _isSubmitting)`. Body Column:
  1. Back arrow (disabled while submitting)
  2. Padding h20:
     - padding v25 Row[`CircleAvatar(r25)` (padding `fromLTRB(15,0,15,20)`), Flexible 'Account
       Settings' (20 amber bold)]
     - padding 10 Column(stretch):
       - 'Edit Your Password.' (20 bold)
       - 16, then 'Current Password' (white text, prefix lock amber, hint 'Enter your current
         password', eye toggle without a tooltip)
       - 16, then 'New Password' (hint 'Enter your new password'). Live validation with the same
         rules and messages as Registration (spec 08 §6), but the error colour is **Colors.red
         `#F44336`** with a red border. Invalid → clear and hide confirm. Valid → show confirm.
         Editing one valid password into another valid one does not clear confirm (spec 19).
       - Optional 16, then 'Confirm New Password' (hint 'Re-enter your new password')
       - 16, then RoundedButton 'Submit' (blue, FA circleCheck), null while submitting
- Submit:
  1. New ≠ confirm → popup "Passwords Do Not Match" / "Please make sure your new password and
     confirmation match." (okay pops).
  2. Set submitting → `POST set_password {current_password, new_password}`.
     - Throw → Sentry with the stack + `showGenericErrorPopup`.
     - Status < 300 → popup "Password Change Successful!" with message "" whose okay deletes the
       legacy password key, pops, and `GoToAccountSettingsScreen`.
     - Otherwise → Sentry `AccountInformationSetFailedException("Error Code 38bcd:")` + generic
       error popup.

## 6. Help (`ContactUs`, state `IsOnContactUsScreenState`)

- `PackageInfo` in `initState`.
- Actions: X → `GoBackNStatesEvent(1)`. `PopScope(canPop: false)` Back → `GoToHubsScreenEvent`.
- `Expanded → SafeArea → scroll → Column`:
  1. Back arrow (padding left 10) → `GoToHubsScreenEvent`
  2. 'Help' (40, bold, padding `fromLTRB(0,35,0,10)`)
  3. Padding v10 → 'Version: <v>\nBuild: <b>\nEnv: <ENV>\nApp Name: <name>' (18, height 1.25,
     centred)
  4. Padding h (width > 500 ? 15% : 15) → Column of RoundedButtons:

     | Label | Colour | Icon | Action |
     |---|---|---|---|
     | 'Customer Support' | blue | FA headset | `https://www.cartell.com/hub-support` |
     | 'FAQ' | **amber** | FA circleQuestion | `https://www.cartell.com/hub-faq` |
     | 'About Us' | blue | FA circleInfo | `https://cartell.com/about/` |
     | "Send Feedback" | **amber** | FA comment | `showCupertinoModalPopup(UserFeedback(location "Contact Us", heading "How'd We Do?", placeholder "Let us know what you think of our app!", after: debugPrint))` |
     | 'Hub Light Guide' (`__DEV__` only) | blue | FA satelliteDish | `GoToHubLightsHelpScreenEvent` |
     | 'Alexa Voice Commands' (only if setting `alexa_enabled` is true) | blue | FA amazon | `GoToAlexaHelpScreenState` |

  Links open in the in-app browser (spec 18 §5).

## 7. Alexa cheat sheet (`AlexaCheatSheet(isConnected)`)

- Actions: X → `GoBackNStatesEvent(1)`. **No PopScope**, so Back does nothing.
- `Expanded → SafeArea → scroll → Column`:
  1. Back arrow → `GoBackNStates(1)`
  2. Padding `fromLTRB(0,25,0,10)`, Row(centre): 'Alexa Voice Command Guide' (20, normal), 5, and
     a pill (border and fill green `#4CAF50` when connected / red `#F44336` when not, radius 10,
     padding h8 v2) with Text 'Connected' / 'Not Connected' (`#25282A`)
  3. Padding h(15%/15) v20 → `Column(spacing 20)`:
     - An info box (`#A2AAAD` fill, black border, radius 10, padding 8): Row[FA exclamation
       (`#25282A`), Flexible "Notifications will automatically be send to Alexa when a sensor is
       triggered" (`#25282A`)]
     - `AdditionalInfoField` × 4 (titles and texts verbatim):
       - 'Hub Status - "Tell me about my hubs"' / "This command gives you information on the
         hubs connected to your account."
       - 'Sensor Status - "Tell me about my sensors"' / "This command gives you information on
         the sensors connected to each of the hubs on your account."
       - 'Last Event - "When was my last event"' / "This command gives information on sensors
         with low battery." (copy bug, keep it)
       - 'Trigger Integrator - "Open my gates"' / "This command opens integrator paired to each
         of the hubs on your account."
     - `SizedBox(20)`
     - A full-width `ElevatedButton` (amber background via ButtonStyle) "Link to Cartell Skill"
       (`#25282A`) → `launchUrl(alexaSkillUri)`

## 8. Hub light guide (`HubLightsHelpScreen`; reachable only in `__DEV__`)

- Actions: X → `GoBackNStates(1)`. No PopScope.
- Padding h(15%/15): 'Hub Light Guide' (40 bold, padding `fromLTRB(0,35,0,10)`). Then seven rows,
  each with padding 8 and Row(spaceBetween) [HubLightWidget, name (14, centred)], in this order:
  Wi-Fi Pairing Mode, Sensor Pairing Mode, Connected to Server, Connected to Wi-Fi, But Not
  Server (with the comma, as in `hub_light_widget.dart:37`), Not Connected to Wi-Fi, Resetting
  to Factory Defaults, Unknown Mode.
- RoundedButton 'Return' (amber, FA leftLong) → `GoBackNStates(1)`.

## 9. User feedback (`components/user_feedback.dart`)

### `requestUserFeedback(context, location, after)`

If `getShowFeedback()` (stored flag, default false) **and** mounted:

- Popup "Give Feedback" / "Thank you for using the Cartell app! If you have a second, we'd
  appreciate any feedback you'd like to give!"
- Cancel "No thanks": pop, `after()`, `setShowFeedback(false)`, toast "If you'd like to give
  feedback in the future, you can do so on the help screen." (black, FA check).
- Okay "Sure!": pop, `showCupertinoModalPopup(UserFeedback(location "Contact Us" (hard-coded),
  heading "How'd We Do?", placeholder "Let us know what you think of our app!", after))`.

Otherwise, `after()` immediately.

Nothing in the app sets the flag to true except the debug "Reset Show Feedback" button, so in
production the prompt never appears and `after()` runs immediately.

### UserFeedback sheet

- `Material → CupertinoPopupSurface → DefaultTextStyle(TextStyle()) → GestureDetector(tap →
  unfocus) → Container(grey[850], height = screenHeight × 0.75, or the full height when
  isBigFont)`.
- `FutureBuilder(setUser())`:
  - **Data**: scroll Column(start):
    - Padding `fromLTRB(15,20,0,20)` heading (24, bold)
    - Padding v15, Row(spaceEvenly) of five circular `ElevatedButton`s (padding 20; background
      amber when selected, else blue; white icon at 35 when selected, else 25): FA faceAngry,
      faceFrown, faceMeh, faceLaugh, faceGrinStars
    - Padding `fromLTRB(15,0,15,10)`: a multiline TextField (`maxLines = ceil(screenHeight/125)`,
      or `/150` at big font; outline radius 10; filled grey[850]; hint white at `screenHeight/60`
      px). `screenHeight` here is the **logical** `MediaQuery` height.
    - RoundedButton 'Close' (blue, `#25282A`, padding `fromLTRB(15,0,15,20)`) → `after()`, pop
    - RoundedButton 'Submit' (amber) → `after()`, `Sentry.captureFeedback(message: "Location:
      <location>\nUser Selected: <Very Bad|Bad|Neutral|Good|Very Good|No Option
      Selected>\n\t<text>", contactEmail: email, name: "first last")`, pop, toast 'Thank you for
      your feedback!' (black, FA check)
  - **Error**: Sentry `NoAccountInformationFoundException("Error Code 4aec9:")` + padding 50 →
    `FriendlyErrorView`.
  - **Loading**: a spinner.
