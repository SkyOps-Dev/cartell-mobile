# 23 — Edit Name, Phone Number and Password

## In short

Three small forms reached from Account Settings. Name and phone are saved **without waiting**: the
app sends the change and returns to Account Settings at once. The password form checks the new
password against the same rules as registration, waits for the server, and confirms success with
a popup.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Where** | Account Settings → tap **Name**, **Phone** or **Password** |
| **Flutter source** | `screens/account/edit_name.dart`, `edit_phone.dart`, `edit_password.dart`, `components/friendly_error_view.dart`, `services/requests/user_requests.dart` |
| **Detailed spec** | `docs/spec/11-account-and-help.md` §3–§5 |
| **Porting plan** | Phase 10 (10.2) |

All three have the top bar (☰, logo, **X**) and an **←** arrow. **X**, **←** and Android Back return
to Account Settings without saving.

## Edit name

### What the user sees

A round avatar picture, "Account Settings" in amber, "Enter Your Name.", **First Name** and **Last
Name** fields filled with the current values, and **Submit** (blue).

### What happens

**Submit** sends `PATCH /auth/users/me/` with `first_name` and `last_name`, and **immediately**
opens Account Settings without waiting for the reply.

### Odd but true

- **Q6**: because the app does not wait, Account Settings can show the **old** name for a moment
  (or until reopened), and a failed save is never reported.
- Empty names are not checked; the error messages "First Name cannot be empty" / "Last Name cannot
  be empty" exist in the code but are switched off.

## Edit phone number

### What the user sees

On opening, a spinner while the app **re-downloads the user's details**. Then the avatar, "Account
Settings", "Enter Your Phone Number.", a **Phone Number** field filled with the current number
(normal keyboard, not the phone keypad), and **Submit**.

If the details cannot be downloaded: an orange "!" icon and "Something went wrong. Please try
again." (or "Your session has expired. Please sign in again." if the session died), with no
buttons.

### What happens

**Submit** sends `PATCH /auth/users/me/` with `phone_no` exactly as typed (no formatting or
checking), and **immediately** opens Account Settings (Q6, as above).

### What the app asks of the server

`GET /auth/users/me/` twice when the form opens (once to show the form, once to fill the field),
then the `PATCH` on Submit.

## Change password

### What the user sees

- **←**, a small avatar and "Account Settings" (amber), then **"Edit Your Password."**
- **Current Password** ("Enter your current password"), with an eye button.
- **New Password** ("Enter your new password"), with an eye button. As the user types, unmet
  rules are listed in red under it, one per line, exactly as on the registration form:
  "Password field cannot be empty", "Password must contain at least one uppercase letter",
  "Password must contain at least one number", "Password must contain at least one special
  character", "Password must be at least 8 characters long".
- **Confirm New Password** ("Re-enter your new password") appears only once the new password meets
  every rule; it is cleared and hidden again whenever the new password stops meeting them.
- **Submit** (blue).

### What happens

1. If New and Confirm differ: popup **"Passwords Do Not Match"** / "Please make sure your new
   password and confirmation match." Nothing is sent.
2. Otherwise a dimmed overlay with a spinner covers the form, and **Submit**, **X**, **←** and Back
   are all disabled until the server answers.
3. The app sends `POST /auth/users/set_password/` with `current_password` and `new_password`.
4. **Accepted** (status below 300): popup **"Password Change Successful!"** with no message.
   **Okay** returns to Account Settings. The user stays signed in.
5. **Refused** (e.g. wrong current password, or the server considers the new one too weak): popup
   **"An error occurred."** / "Please try again. Contact support if errors persist." The server's
   reason is not shown.
6. **Network error**: the same "An error occurred." popup.

### Odd but true

- **Q26**: if the user changes a valid new password into a *different* valid one, the Confirm field
  keeps its old text, so they may get "Passwords Do Not Match" without seeing why.
- The rule messages are **bright red** here, a slightly different red from the registration form.
- The server's reason for refusing is never shown, so a wrong current password and a weak new
  password look the same to the user.
- On success the app also deletes any password stored by very old app versions.

## Related

- [22 Account settings](22-account-settings.md) · [03 Create an account](03-create-an-account.md)
  (same password rules)
