# 30 — How the App Talks to the User: Popups, Toasts and Banners

## In short

The app uses a small, fixed set of ways to tell the user something. Knowing them makes every other
page easier to read, and the React Native copy must reproduce each one exactly: look, position,
timing, and how it is dismissed.

| | |
|---|---|
| **Flutter source** | `components/popups.dart`, `utilities/bloc_popups.dart`, `components/errors/*`, `components/teast_popups.dart`, `components/friendly_error_view.dart`, `components/hub_status_glyph.dart` |
| **Detailed spec** | `docs/spec/07-design-system.md` §5, §6, §10 |
| **Porting plan** | Phase 5 (5.x) |

## 1. Popup (dialog)

The main way to ask, warn or confirm.

- A dark grey (`#25282A`) box with rounded corners in the middle of a dimmed screen.
- Top to bottom: a large **amber icon** (a "!" in a circle by default; some popups use another
  icon, e.g. a ✓ for "account created"), a **bold white title**, a **grey message**, an optional
  extra (a text field for Delete Account, the checks for Test Connection), then the buttons.
- **One button**: a blue pill, "Okay" unless renamed.
- **Two buttons**: a grey pill on the left ("Cancel" unless renamed) and a blue pill on the right
  ("Okay" unless renamed).
- **Tapping outside does not close it.** Android's Back button does.
- It stays until a button is pressed. Most buttons also close it; a few run an action first.

Examples: "Log Out", "Delete Hub?", "Account Not Found", "Stop Pairing?", "Can't Get Location".

**The firmware error dialog is different**: it is the plain system-style dialog (dark background,
title, message, one amber "OK" text button), and tapping outside closes it. See
[15](15-firmware-updates.md).

## 2. Toast

A short confirmation that does not need an answer.

- A flat grey (`#54585A`) bar that **fades in at the top centre**, 50 px from the top, with a white
  icon and white text.
- Disappears after **5 seconds**, or when swiped away. Showing a new toast removes any current
  one first.
- Icons: ✓ in a circle for success (two slightly different ✓ styles are used, depending on the
  screen), "!" in a circle for failure.
- Two toasts use **black** instead of grey: "Thank you for your feedback!" and "If you'd like to
  give feedback in the future, you can do so on the help screen.".

Used by: every on/off switch (hub, sensor, account settings), **Open Gate**, **Pair Integrator**,
feedback.

## 3. Top banner (sensor "Pair Sounder" only)

- A grey rounded box (screen width minus 40 px, about 1/9 of the screen tall) that **slides/fades
  in at the top** with a white ✓ and "Sent pairing message successfully".
- Closes itself after **4 seconds**.
- Unlike a toast, it **blocks the rest of the screen** while it is up.

## 4. Inline messages and status text

- **Under a field**: e.g. "Email field cannot be empty", the red password-rule list, "This
  password is too long for the hub...".
- **In place of content**: the friendly error view (orange "!" with "Something went wrong. Please
  try again.", "Your session has expired. Please sign in again." or "We couldn't load your
  account information. Please try again."), used on Edit phone and the feedback panel; the raw error
  on Hub history.
- **Status lines**: "Status: Checking..." → "Status: Connected" / "Disconnected" / "Last known
  ...", and "Battery Status: Checking..." → "Low" / "Good". "Checking" always means *the app is
  confirming with the server right now*; "Last known" means *that check failed, and this may be
  out of date*.

## 5. Full-screen takeovers

- **Loading screen** (white spinning ring under the logo bar) while something essential loads.
- **Maintenance / can't reach Cartell** (see [07](07-maintenance-and-no-connection.md)).
- **Pairing outcome screens** (see [11](11-connect-hub-to-wifi.md)).

## 6. Other overlays

- **Dimmed overlay with a spinner** while a form is being sent: Login, Registration, Change
  password. The form stays visible underneath; buttons are disabled.
- **Bottom panels** that slide up: Debug Info and Send Feedback. Tapping above them closes them.
- **⋮ menus**: a small dark menu next to the button. Items in red are destructive (Delete Hub,
  Delete Sensor). On Hub details, choosing Delete Hub opens the popup **on top of** the still-open
  menu.

## Behaviour common to all

- Popups that come from sign-in, registration and log-out are raised centrally and appear over
  whatever screen is current.
- If an unrecognised kind of message is ever raised, the app shows a "Whoops" / "I'm not sure what
  this is. Sorry!" popup. This should never happen in practice.
- Every exact message is listed in [A5 Message catalogue](A5-message-catalogue.md).

## Related

- [A5 Message catalogue](A5-message-catalogue.md) · [08 Navigation](08-navigation-and-screen-layout.md)
