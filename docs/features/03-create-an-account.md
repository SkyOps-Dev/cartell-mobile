# 03 — Create an Account (Register)

## In short

A new homeowner creates a Cartell account with their name, email, a password and (optionally) a
phone number. The form checks the email and password as they type. When the server accepts the
account, the app does **not** sign them in. It sends them to the Login screen with their email
already filled in, and offers to save the new password to the phone's password manager.

| | |
|---|---|
| **Who** | New users |
| **Where** | Welcome → **Register**, or Login → "Create One Here" |
| **Flutter source** | `screens/welcome/registration_screen.dart`, `bloc/auth/events/attempt_registration_event.dart`, `services/requests/auth_requests.dart` (`register`) |
| **Detailed spec** | `docs/spec/08-auth-and-session.md` §6, §9 |
| **Porting plan** | Phase 7 (step 7.5) |

## What the user sees

No top bar. A round **←** (back) button floats in the top-left corner. The form is centred and at
most 500 px wide:

1. The Cartell logo (small).
2. **"Create Account"** (large, bold).
3. "Create a new account to get started with your Cartell alert system!"
4. **First Name** and **Last Name**, side by side. First Name has a person icon; Last Name has no
   icon.
5. **Email** (envelope icon, email keyboard).
6. **Password** (padlock icon, hidden text, eye button to show or hide it).
7. **Confirm Password**: appears only once the password meets every rule.
8. **Phone Number** (phone icon, phone keypad).
9. **Register** button (blue).
10. "Already have an account?" followed by an amber "Login Here" link.

All fields have rounded amber outlines. Labels sit inside the fields and float up when the user
types.

## Rules checked while typing

**Email**: checked on every keystroke. It is accepted when it contains "@" and "." and is at least
5 characters long. Otherwise the field turns red and shows **"Please enter a valid email"**. The
server does the real validation.

**Password**: checked on every keystroke. Every rule that fails is listed, one per line, in red
under the field:

| Rule | Message |
|---|---|
| Empty | "Password field cannot be empty" (and no other rule is checked) |
| No capital letter A–Z | "Password must contain at least one uppercase letter" |
| No digit 0–9 | "Password must contain at least one number" |
| No special character from `!@#$%^&*(),.?":{}|<>` | "Password must contain at least one special character" |
| Fewer than 8 characters | "Password must be at least 8 characters long" |

While any rule fails, the **Confirm Password** field is hidden and its contents are wiped. As
soon as all rules pass, the red text disappears and Confirm Password appears.

**First name, last name, phone**: not checked by the app at all.

The **Register** button is always enabled. The checks above are guidance only and do not block
sending.

## What happens when...

| The user... | What happens |
|---|---|
| taps **Register** | The form is sent (below). A dimmed overlay with a spinner covers the form; the Register and back buttons are disabled. The form stays on screen underneath. |
| taps **←** or "Login Here" | Goes to the Welcome screen (←) or the Login screen ("Login Here"). Anything typed is discarded and the password manager is told not to save it. |
| presses Android **Back** | The app closes (goes to the background). |

### Sending the form

1. **Passwords must match.** If Password and Confirm Password differ, the popup **"Unable to Create
   Account"** / "Passwords do not match. Please re-enter them and try again." appears, and the
   form is shown again with everything except the passwords kept.
   - Note: if the password never passed the rules, Confirm Password was never shown and is
     empty, so this is the message the user gets.
2. The app sends the account to the server.
3. **Server says created (201):**
   - The phone's password manager is told to save the email and password. On iOS (iCloud
     Keychain) and Android (Google Password Manager) this shows the usual "Save password?" offer.
   - A popup with a ✓ icon appears. Its large title reads **"Your account was created. Please
     login"** and the smaller text below reads "Registration Succeeded" (Q3: these are the wrong way
     round in the code, and the copy keeps them).
   - The **Login screen** opens with the email filled in.
4. **Server rejects the details (status 300–499):** popup **"Unable to Create Account"** with the
   server's reason. The app shows the messages for the **first** problem field it finds, in this
   order: email, password, first name, last name, phone. Each message is on its own line,
   starting with a line break and a space, word for word as the server wrote it (for example,
   the server's message that the email is already in use, or that the password is too similar to
   the email). If none of those fields is mentioned: "An error occurred. Please try again."
5. **Any other answer (for example a server error):** popup **"Unable to Create Account"** /
   "Something went wrong on our end. Please try again in a moment."

In every failure case the user is returned to the form with first name, last name, email and phone
kept, and the overlay removed.

## What the app asks of the server

| Request | Sends | Expects |
|---|---|---|
| `POST /auth/users/` (no sign-in header) | `email`, `first_name`, `last_name`, `password`, `phone_no` (empty text if not given) | **201** with the new user. On 4xx, a JSON object whose keys are field names and whose values are lists of messages. |

The request is preceded by the usual maintenance check. The account can sign in immediately;
there is no "confirm your email" step in the app.

## When something goes wrong

| Situation | What the user sees |
|---|---|
| Passwords differ | "Unable to Create Account" / "Passwords do not match. Please re-enter them and try again." |
| Server rejects a field | "Unable to Create Account" / the server's messages for that field |
| Server error (5xx or other) | "Unable to Create Account" / "Something went wrong on our end. Please try again in a moment." |
| Request times out or another app error occurs | A popup whose large title reads **"Request timed out. Check your internet connection, and then try again."** and whose small text reads **"An Error Occured"** (title and message swapped, typo kept) |
| No network at all | **The spinner stays up** (Q4). Usually the "can't reach Cartell" screen then takes over within 15 seconds (see [07](07-maintenance-and-no-connection.md)). |

## Odd but true

- **Q3**: the success popup and the timeout popup have their title and message swapped.
- **Q4**: a dropped network during sending leaves the overlay spinning, because that particular
  failure is not caught.
- **The Register button never greys out** for invalid input. Users can submit an invalid email or
  weak password; the server then refuses it.
- **Registering does not sign the user in.** They must log in on the next screen.
- **Leaving the screen never saves the password** to the password manager. Only a successful
  registration does.

## Related

- [04 Log in](04-log-in.md), where the user goes next.
- [23 Edit password](23-edit-name-phone-and-password.md) uses the same password rules.
- [A5 Message catalogue](A5-message-catalogue.md)
