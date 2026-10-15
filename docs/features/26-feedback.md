# 26 — Send Feedback

## In short

Users can rate the app with one of five faces and write a comment. The feedback does **not** go to
the Cartell server. It goes to **Sentry**, the error-reporting service, tagged with the user's name
and email, where the team reads it. There is also an automatic "Give Feedback?" prompt after a
successful hub pairing or firmware update, but it is switched off for normal users.

| | |
|---|---|
| **Who** | Every signed-in user |
| **Where** | Help → **Send Feedback**; the automatic prompt (see below) |
| **Flutter source** | `components/user_feedback.dart`, `screens/misc/contact_us.dart`, `services/secure_storage.dart` (`feedbackToken`) |
| **Detailed spec** | `docs/spec/11-account-and-help.md` §9 |
| **Porting plan** | Phase 10 (10.4) |

## The feedback panel

A dark grey panel slides up from the bottom, covering about three-quarters of the screen (or all of
it when the phone's text size is large). Tapping outside the text box hides the keyboard; tapping
above the panel closes it.

While the user's details load, a spinner shows. Then:

1. **"How'd We Do?"** (large, bold).
2. Five round buttons with faces: angry, frowning, neutral, laughing, star-struck. The chosen one
   turns amber with a bigger icon; the others are blue.
3. A large text box: "Let us know what you think of our app!".
4. **Close** (blue): closes the panel without sending.
5. **Submit** (amber): sends the feedback, closes the panel, and shows the black toast "Thank you
   for your feedback!".

Choosing a face and writing a comment are both optional; Submit always sends.

If the user's details cannot be loaded, the panel shows an orange "!" with "Something went wrong.
Please try again." instead (error code `4aec9` goes to Sentry).

## What is sent

One Sentry "user feedback" entry:

| Field | Value |
|---|---|
| Name | "First Last" |
| Contact email | the account email |
| Message | `Location: Contact Us` (new line) `User Selected: Very Bad / Bad / Neutral / Good / Very Good / No Option Selected` (new line, tab) `<the comment>` |

The faces map left to right: angry = Very Bad, frowning = Bad, neutral = Neutral, laughing =
Good, star-struck = Very Good.

To fill in the name and email, the panel downloads the user's details from the server when it opens
(`GET /auth/users/me/`). Nothing else touches the Cartell server.

## The automatic "Give Feedback" prompt

After **Continue** on a successful hub pairing, and when leaving the firmware screen after a
successful update, the app checks a flag stored on the phone (`<ENV>_feedbackToken`):

- **Flag on**: popup **"Give Feedback"** / "Thank you for using the Cartell app! If you have a
  second, we'd appreciate any feedback you'd like to give!" with **No thanks** and **Sure!**.
  - **Sure!** opens the feedback panel.
  - **No thanks** closes it, turns the flag off, and shows the toast "If you'd like to give feedback
    in the future, you can do so on the help screen."
- **Flag off**: nothing appears and the app carries on.

The flag starts **off**, and nothing in the app turns it on except the developer-only **Reset Show
Feedback** button in the Debug Info panel. **So store users never see this prompt** (Q32).

## Odd but true

- **Q32**: the automatic prompt cannot appear for normal users.
- The "Location" in the message always says **"Contact Us"**, even when feedback came from the
  automatic prompt after pairing or a firmware update.
- Feedback is only visible to whoever has access to the Sentry project, not in any Cartell admin
  screen.

## Related

- [25 Help](25-help-screen.md) · [31 Error reporting](31-error-reporting-and-logging.md) ·
  [02 Debug Info](02-welcome-screen-and-debug-info.md)
