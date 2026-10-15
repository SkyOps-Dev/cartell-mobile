# 05 — Biometric Unlock (Fingerprint / Face ID)

## In short

An optional lock. When it is on, every time the app starts it asks for the user's fingerprint or
face (or the phone's PIN as a fallback) before showing anything. It protects the app from someone
else picking up an unlocked phone. It does not replace the account password; it sits in front of
the automatic sign-in.

| | |
|---|---|
| **Who** | Users whose phone has a fingerprint or face enrolled |
| **Where** | Offered once after the first successful login; switched on or off in Account Settings → "Unlock with Biometrics:"; enforced at app start |
| **Flutter source** | `services/biometric_service.dart`, `screens/welcome/lock_screen.dart`, `bloc/auth/events/auto_login_event.dart`, `bloc/auth/events/attempt_logging_in_event.dart`, `screens/account/account_settings.dart`, `services/secure_storage.dart` |
| **Detailed spec** | `docs/spec/03-foundation-services.md` §5 · `08-auth-and-session.md` §3–§5 · `11-account-and-help.md` §2 |
| **Porting plan** | Phase 7 (steps 7.2, 7.3) |

## The three states of the setting

The phone remembers one of three values, separately for each server (live, test, beta):

| Value | Meaning | How it gets there |
|---|---|---|
| *never asked* | The user has not been offered biometric unlock on this phone | Fresh install, or after logging out or deleting the account |
| **off** | Asked and declined, or turned off | The login offer sets this *before* it asks; the Account Settings switch; the app clears it itself if the phone no longer has biometrics |
| **on** | The lock is active | **Okay** on the login offer, or the Account Settings switch |

## Turning it on

**After login (once per phone):** if the setting is *never asked* and the phone has a fingerprint
or face enrolled, the app writes **off** and then shows the popup **"Unlock with biometrics?"** /
"Use your fingerprint or face to open Cartell instead of typing your password. You can change this
later in Account Settings." **Okay** turns it on; **Cancel** leaves it off. Either way the offer
never appears again on this phone.

**From Account Settings:** the row **"Unlock with Biometrics:"** with a switch. See
[22](22-account-settings.md). The row is shown if the phone has a fingerprint/face enrolled, or the
lock is already on, or the app could not read the setting. That way someone stuck with the lock on
can always turn it off. Switching:

- on → toast "Cartell will ask for your fingerprint or face when it opens."
- off → toast "Biometric unlock turned off."
- could not save → the switch flips back and the toast says "Could not save that setting. Please
  try again."

## What happens at app start when it is on

During automatic sign-in, after confirming a session exists and **before** any network work, the
phone shows its own biometric prompt with the reason **"Unlock Cartell"**:

- **Android**: the system "BiometricPrompt" sheet, with the option to use the device PIN,
  pattern or password.
- **iOS**: the Face ID / Touch ID prompt. The Face ID permission text is "Cartell uses Face ID to
  unlock the app so you can check your property without typing your password." On failure iOS
  offers the passcode.

| Result | What happens |
|---|---|
| Recognised (or correct PIN) | Sign-in continues normally to the Hubs list |
| Phone no longer has biometrics or a passcode | The app quietly switches the lock **off** and continues. The user is never locked out by a missing fingerprint. |
| Too many attempts (temporary or permanent lockout) | **Lock screen** with the message "Too many attempts. Use your password to sign in instead." |
| Cancelled, or not recognised | **Lock screen** with no message |

## The Lock screen

No top bar. Centred:

1. Cartell logo (large).
2. A grey fingerprint icon.
3. **"Cartell is locked"**
4. *(only after a lockout)* "Too many attempts. Use your password to sign in instead." in grey.
5. **Unlock** button (blue, fingerprint icon): runs the whole automatic sign-in again, including
   the biometric prompt.
6. **"Use password instead"** (amber link): opens the Login screen. Logging in with the password
   works normally and leaves the setting as it was.

Android **Back** on the Lock screen closes the app. There is no way past the lock except a
successful unlock or a password login.

## What the app asks of the server

Nothing. Biometrics are handled entirely on the phone. The setting is stored in the phone's secure
storage under the key `<ENV>_biometricsEnabled` (see [A2](A2-data-kept-on-the-phone.md)).

## When it is cleared

The setting goes back to *never asked* on **log out** and on **delete account**, so the next
person to sign in on the phone gets a fresh offer instead of inheriting the lock.

## Odd but true

- **The offer is recorded as "off" before the popup appears.** The popup has no separate
  "decline" action, so this is how the app makes sure it asks only once.
- **The prompt allows the device PIN**, not only biometrics, so a user who deletes their
  fingerprint still gets in with their PIN rather than being locked out.
- **The "Unlock with Biometrics" row lines up differently on iOS and Android**: 0 px side padding on
  iOS, 20 px on Android (Account Settings).

## Related

- [01 App start](01-app-start-and-automatic-sign-in.md) · [04 Log in](04-log-in.md) ·
  [22 Account settings](22-account-settings.md) · [06 Log out](06-session-and-log-out.md)
