# A2 — Data Kept on the Phone

What the app stores on the phone, where, and when it is removed. In short: **only sign-in keys and a
few preferences are saved**. Everything else (hubs, sensors, events, account details) lives in
memory and disappears when the app is closed.

Detailed spec: `docs/spec/03-foundation-services.md` §4 (including the exact keychain/keystore
formats the React Native app must read after an upgrade) and `05-models-and-cache.md`.

## Saved securely (survives closing the app)

Stored in the phone's secure storage: the **iOS Keychain**, and on **Android** encrypted storage
protected by the Android Keystore. Every key starts with the environment name (`LIVE_`, `TEST_`,
`BETA_`, `DEVELOPMENT_`), so each server has its own separate set ([29](29-environments-and-test-builds.md)).

| Key | Holds | Written | Deleted |
|---|---|---|---|
| `<ENV>_access` | Access token (short-lived sign-in key) | Login; each session renewal | Log out; delete account |
| `<ENV>_refresh` | Refresh token (about 180 days, replaced on each use) | Login; each session renewal | Log out; delete account |
| `<ENV>_fcmToken` | This phone's push-notification token | Start-up, login, Firebase token change | Log out; switching server in the debug menu |
| `<ENV>_biometricsEnabled` | "true", "false", or absent (= never asked) | Login offer; Account Settings switch; auto-cleared if biometrics vanish | Log out; delete account |
| `<ENV>_feedbackToken` | Whether to show the "Give Feedback" prompt ("true"/"false"; absent = false) | Debug "Reset Show Feedback"; "No thanks" | never |
| `<ENV>_userName` | (unused) | never | never |

**Old keys cleaned up**: very old app versions saved the email (`<ENV>_email`), the password
(`<ENV>_password`) and a "credentials saved" flag (`<ENV>_false`). The current app never writes
them and deletes them at every start-up, login, log out, password change and account deletion.

**The password is never stored.** Staying signed in relies only on the tokens. Saving a password
for autofill is handled by the phone's own password manager (iCloud Keychain / Google Password
Manager), only after a successful login or registration ([04](04-log-in.md)).

## Kept in memory only (gone when the app closes)

| Data | Notes |
|---|---|
| Hubs (with their sensors) | One shared copy per hub. Every screen showing that hub sees updates at once. |
| Sensors | Same |
| The signed-in user | Used for the menu header |
| Event history pages | Per screen |
| Locations, firmware records | |
| When the session was last confirmed | For the 60-second shortcut ([06](06-session-and-log-out.md)) |
| The environment chosen in the debug menu | Resets to the built-in one on restart |

Shared copies are **updated in place** when new data arrives, but a few fields are **not**
refreshed during a session (Q19): a hub's "integrator support" flag, location and date added, and a
sensor's "flagged" flag. They update after the app restarts.

## Not stored anywhere on the phone

- No offline copy of hubs or events: without a connection, the app cannot show the hub list.
- No photos, recordings or location history. Sensor coordinates are stored on the server.
- No analytics stored by the app itself (Firebase Analytics on Android manages its own data).

## When the user...

| Action | What happens to stored data |
|---|---|
| Logs out | Tokens, push token, biometric setting and old credentials deleted. Feedback flag kept. |
| Deletes the account | Tokens, biometric setting and old credentials deleted. **Push token kept.** |
| Uninstalls the app | Android: everything goes. iOS: Keychain items can survive an uninstall, so a reinstall may find the old tokens and sign straight in. |
| Switches server (debug) | Nothing deleted except the new environment's push token; the other environment's data is untouched |

## Related

- [06 Session and log out](06-session-and-log-out.md) · [05 Biometric unlock](05-biometric-unlock.md) ·
  [20 Notifications](20-notifications.md)
