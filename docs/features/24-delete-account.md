# 24 — Delete Account

## In short

Permanently deletes the user's Cartell account. The user confirms with their password. The server
deletes the account, the phone forgets the sign-in, and the user lands on the Welcome screen.

| | |
|---|---|
| **Who** | Any signed-in user |
| **Where** | Account Settings → ⋮ → **Delete Account** |
| **Flutter source** | `screens/account/account_settings.dart` (`showAlertDialogRemoveAccount`, `showAlertDialogRemoveAccountSuccess`), `services/requests/user_requests.dart` (`deleteAccount`) |
| **Detailed spec** | `docs/spec/11-account-and-help.md` §2.1 |
| **Porting plan** | Phase 10 (10.1) |

## What happens, step by step

1. ⋮ → **Delete Account**. The menu closes.
2. Popup **"Delete Account"** / "You are about to delete your account. Possible data loss can
   occur. If you are sure that you want to delete your account, please enter your password.",
   with a hidden-text password field ("Enter your password") and **Cancel** / **Delete**.
3. **Cancel** closes the popup. Nothing changes.
4. **Delete**:
   1. The app asks the server to delete the account, sending the typed password.
   2. **Whatever the server answers**, the phone then deletes its stored sign-in (refresh and
      access tokens), the biometric setting, and any password kept by very old versions.
   3. A second popup appears on top: **"Account Successfully Removed"** / "Your account has been
      removed."
   4. **Okay** closes both popups and shows the **Welcome** screen.

## What the app asks of the server

| Request | Sends | Expects |
|---|---|---|
| `DELETE /auth/users/me/` | `current_password` (as a form body on a DELETE) | normally 204. The answer is **not checked**. |

## When something goes wrong

| Situation | What the user sees |
|---|---|
| **Wrong password** | Still "Account Successfully Removed", and the user is signed out. **The account is not actually deleted** and they can log back in (Q2). |
| Server error | Same as above (Q2) |
| The session check fails before sending | Nothing happens: the "Delete Account" popup stays open (error report only) |
| No network | Nothing happens; the popup stays open |

## Odd but true

- **Q2**: the success message and the sign-out happen even when the server refused, so a typo in
  the password looks like a successful deletion.
- **The phone's push token is not unregistered** here (unlike Log Out). If the account still
  exists (wrong password), this phone can keep receiving its alerts.
- A second, hidden **Delete Account** button exists on the Account Settings screen but is never
  visible.

## Related

- [22 Account settings](22-account-settings.md) · [06 Log out](06-session-and-log-out.md) ·
  [A2 Data on the phone](A2-data-kept-on-the-phone.md)
