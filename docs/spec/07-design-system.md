# 07 — Design System and Shared Components

Plan steps: 1.4, 2.5, 2.6, 5.1–5.11. Sources: `utilities/constants.dart`, `main.dart`,
`components/**`, `frontend/DESIGN.md` (for context only; **as-built code wins**),
`frontend/.impeccable/design.json`.

## 1. Theme root

- `ThemeData.dark().copyWith(primaryColor: #0A0E21, scaffoldBackgroundColor: #0A0E21)`.
  - **Material 3 is on** (the default since Flutter 3.16).
  - Colour scheme is the **Material 3 dark baseline `_colorSchemeDarkM3`**, not
    `ColorScheme.dark()`: with Material 3 on and no seed, `ThemeData` picks
    `colorScheme ??= isDark ? _colorSchemeDarkM3 : _colorSchemeLightM3` (`theme_data.dart:444`).
    Primary `#D0BCFF`, error `#F2B8B5`, surface `#141218`, onSurface `#E6E0E9`. Roles in §3.1.
    (Corrected 2026-10-12: this line said `ColorScheme.dark()` — `#BB86FC`, `#CF6679`,
    `#121212` — which made the first build's back arrow black and its hints white.)
  - No custom `textTheme`, component themes, or `colorScheme` override.
- Every screen background is `#0A0E21`, except:
  - the QR scanner, which uses black
  - Cupertino sheets, which have their own surface
  - Welcome, Login, Registration, Lock and Hub-added screens, which are plain Scaffolds (still
    `#0A0E21`)

## 2. Typography

- Platform fonts: Android uses Roboto (system). iOS uses San Francisco (Flutter's Material 2021
  typography for iOS maps to the system font). React Native defaults match.
- **Ambient default text style** (Material 3 bodyMedium on `Material`/`Scaffold` surfaces): 14 px,
  w400, letter-spacing 0.25, height 20/14 ≈ 1.43, colour onSurface (`#E6E0E9`; the dark text
  theme is coloured from the colour scheme by `Typography.material2021`).
  - A widget `Text('x', style: TextStyle(fontSize: 17))` **merges** with it, so it keeps
    letter-spacing 0.25 and the 1.43 height multiplier, giving a line height of about 24.3 at
    17 px.
  - The RN `<Text>` wrapper must apply this merge rule.
  - Confirm every value against the Flutter 3.41.9 typography source in Phase 1.4.
- Material 3 2021 scale (for widgets that use theme styles):

  | Style | Size / line height / tracking |
  |---|---|
  | displayLarge | 57/64/−0.25 |
  | displayMedium | 45/52/0 |
  | displaySmall | 36/44/0 |
  | headlineLarge | 32/40 |
  | headlineMedium | 28/36 |
  | headlineSmall | 24/32 |
  | titleLarge | 22/28 |
  | titleMedium | 16/24/0.15 w500 |
  | titleSmall | 14/20/0.1 w500 |
  | labelLarge | 14/20/0.1 w500 |
  | labelMedium | 12/16/0.5 w500 |
  | labelSmall | 11/16/0.5 w500 |
  | bodyLarge | 16/24/0.5 |
  | bodyMedium | 14/20/0.25 |
  | bodySmall | 12/16/0.4 |

  Confirm the values in the SDK.
- Inside `CupertinoPopupSurface` (debug menu, feedback sheet) the code wraps content in
  `DefaultTextStyle(style: TextStyle())`, which **resets** the ambient style, so unstyled text
  there falls back to engine defaults. Measure the colour and size from references.
- Source Sans Pro (Regular file only; bold is synthesised) is used on exactly three texts:
  - Hubs title (32, bold, letter-spacing 2)
  - Hubs subtitle (20)
  - Sensors title (24, bold, letter-spacing 2) and subtitle (16, height 1.25)
- `kLabelTextStyle` is 17, white.

## 3. Material 3 defaults to resolve from the SDK (Phase 1.4)

Fill this table from Flutter 3.41.9 source (`packages/flutter/lib/src/material/`, the `*DefaultsM3`
classes) and verify against references.

| Widget | Used where | Values to resolve |
|---|---|---|
| AppBar | every AppScaffold, Load, Maintenance, QR scanner | toolbar height 56, title spacing, leading width 56, icon size and colour (onSurface), `centerTitle` per platform (iOS true when actions < 2), title text style (QR: titleLarge), status-bar style for a dark `#25282A` background, scrolledUnderElevation and surface tint |
| Drawer | NavBar | width (Material 3: 360?), end-corner shape radius, elevation, scrim colour, edge drag width, open/close curve and duration |
| UserAccountsDrawerHeader | NavBar | height, margins, padding, avatar size (72?), name and email styles, spacing |
| ListTile | drawer rows, popup items, Wi-Fi list | min height 48/56, padding 16, leading width and gap, title style bodyLarge, icon colour |
| Divider | many | default thickness 1, colour outlineVariant; explicit thickness, colour and indents override |
| Switch | AutoSwitch | track 52×32, thumb sizes (on 24, off 16, pressed 28), the on track (amber thumb on what track colour?), off track and outline colours, thumb icon, animation duration |
| InputDecorator (outlined) | kTextFieldDecoration fields | label float animation, label colour (labelStyle white70) and floating colour, hint style, helper and error text style (bodySmall, error colour `#F2B8B5` unless overridden), counter style, prefix and suffix icon colours and sizes, content padding (10/20 explicit), dense rules |
| InputDecorator (underline, default) | Wi-Fi password field | underline colours, focus colour (primary `#D0BCFF`), hint colour, error lines |
| TextField cursor and selection | all fields | cursor colour (primary), selection handles and colour |
| FloatingActionButton | Hubs, Sensors, pairing help | 56 size, 16 radius (Material 3 default), elevation 6, pressed and hover elevation, icon size 24 |
| IconButton | back arrows, X, eye toggles | 48 hit area, icon size 24, colour onSurfaceVariant or onSurface, highlight shape |
| TextButton | Forgot Password, Retry, links | label style labelLarge, padding, foreground colour primary `#D0BCFF` where not overridden (Maintenance "Retry", FriendlyErrorView) |
| ElevatedButton | "Open Debug Info" (lavender), "Pair Integrator", "Link to Cartell Skill", feedback faces | background surfaceContainerLow, foreground primary, elevation 1, shape stadium, padding, height 40 |
| MaterialButton | inside RoundedButton | textTheme normal, label labelLarge, padding h16, **ink and splash shape (default RoundedRectangle r?) clipped how?** (the press ripple may be rectangular inside the pill) |
| PopupMenuButton / PopupMenuItem | kebab menus, Ellipsis | menu colour (surfaceContainer), elevation 3, shape radius 4, item height 48, padding, position relative to the button, enter animation |
| AlertDialog | `showPopupMessage`, firmware error dialog | inset padding (40/24), content padding, title (headlineSmall) and content (bodyMedium, onSurfaceVariant) styles, actions padding, shape radius 28 (Material 3) **but popups override it to 16**, elevation 6, surface tint, barrier `Colors.black54`, enter animation (fade and scale?) and duration |
| CircularProgressIndicator | spinners | stroke 4, size 36 (Material 3 2024 spec?), colour primary, indeterminate animation curve |
| LinearProgressIndicator | reset screen | indeterminate animation, colours explicit |
| Scrollbar | hub settings | thumb thickness, radius, colour, margins, fade |
| Tooltip | IconButtons with tooltip | style (long press) |
| SnackBar | not used | |
| Ink ripple | every InkWell | InkSparkle (Android, Material 3) vs InkRipple (iOS); splash colour (onSurface 0.1?) |

### 3.1 Resolved values (part 5, 2026-10-12, from the Flutter 3.41.9 SDK source)

Only the widgets Login and Registration use are resolved so far; the rest of the table above is
resolved as later screens need them. Paths are under `packages/flutter/lib/src/material/`.

**Colour roles that matter** (`theme_data.dart` `_colorSchemeDarkM3`, chosen at line 444):
primary `#D0BCFF`, onPrimary `#381E72`, primaryContainer `#4F378B`, onPrimaryContainer
`#EADDFF`, error `#F2B8B5`, onError `#601410`, surface `#141218`, surfaceContainerLow `#1D1B20`,
surfaceContainerHigh `#2B2930`, onSurface `#E6E0E9`, onSurfaceVariant `#CAC4D0`, outline
`#938F99`, shadow and scrim black. `ThemeData.dark().copyWith(primaryColor, scaffoldBackground)`
does not touch the scheme. Ink highlight and splash stay `#40CCCCCC` (`theme_data.dart:501`).

**Typography** (`typography.dart` `englishLike2021`; every style uses
`leadingDistribution: even`):

| Style | Size | Weight | Letter-spacing | Height multiplier |
|---|---|---|---|---|
| bodyLarge | 16 | 400 | 0.5 | 1.50 |
| bodyMedium | 14 | 400 | 0.25 | 1.43 |
| bodySmall | 12 | 400 | 0.4 | 1.33 |
| labelLarge | 14 | 500 | 0.1 | 1.43 |
| titleMedium | 16 | 500 | 0.15 | 1.50 |
| headlineSmall | 24 | 400 | 0 | 1.33 |

(The table in §2 lists 20/14 etc.; the source multipliers are the ones above.)

**MaterialButton** (inside RoundedButton and the popup buttons; `material_button.dart`,
`button_theme.dart`, `button.dart`):
- Text style labelLarge; ButtonTextTheme.normal; padding horizontal 16, vertical 0.
- **Tap-target padding makes it at least 48×48** (`RawMaterialButton` → `_InputPadding`,
  `MaterialTapTargetSize.padded` on phones). Cartell's coloured `Material` wraps the button, so
  **RoundedButton's pill is 48 tall (not 45)** and the popup pills (`height: 10`) are **48 tall**
  as well. The inner area keeps its own height (45, or the label's line height) centred in the 48.
- Ink shape is `RoundedRectangleBorder(radius 2)` over the inner area, and is **not** clipped
  to the outer pill: the press highlight (`ThemeData.highlightColor` `#40CCCCCC`) is a
  near-rectangle whose corners show beyond the pill's round ends. Splash colour `#40CCCCCC`;
  splash factory InkSparkle on Android, InkRipple on iOS (`theme_data.dart:415`).
- Inner Material is transparent, so it draws no shadow; only Cartell's outer `Material(elevation
  5 or 3)` does (shadow colour black, no surface tint).

**Outlined InputDecorator** (`input_decorator.dart`, `_InputDecoratorDefaultsM3`), with
`kTextFieldDecoration` applied:
- Input text: bodyLarge (16, letter-spacing 0.5, height 1.5), white.
- Container height `max(48, 10 + 24 + 10, icon box)` = **48**. Input starts at **24** from the
  border (contentPadding 20 + outline `inputGap` 4); with a prefix icon, at **52** (icon box 48
  + `prefixToInputGap` 4). A suffix icon box sits at the end, followed by a 4 gap.
- Prefix/suffix icon boxes: at least 48×48, icon size 24. Prefix icon colour comes from the call
  site (amber). Default suffix colour onSurfaceVariant (error: `#F2B8B5`); the eye IconButton
  sets white70.
- **Label** (resting and floating, focused or not, error or not): **white70**, because
  `labelStyle` merges last over every state colour. Resting 16 with height 1; floating scale
  **0.75** (12), centred on the top border line, at x = contentPadding.start (20), with an
  outline gap of `label width × 0.75 + 4 + 4`. Float animation **167 ms `fastOutSlowIn`**
  (reverse: flipped). Hint fade 20 ms.
- **Label width cap** (`_RenderDecoration.performLayout`, line 1032): `box width − (inputGap 4 × 2
  + (prefix icon width 48, or contentPadding.start 20) + (contentPadding.end 20, or with a suffix
  icon lerp(suffix width, 20, float progress)))`, then × `lerp(1, 1/0.75, float progress)`; the
  label is `Text(overflow: ellipsis)`. On a phone, Registration's resting "First Name" (beside the
  person icon, half the row) is cut to **"First Na…"**; floated it fits.
- **Hint**: bodyLarge, onSurfaceVariant **`#CAC4D0`** (light grey, not white). With a label it
  shows only while focused and empty; without a label (Login), whenever empty. One line, ending
  in "…" (TextField passes `maxLines: 1` as `hintMaxLines`).
- **Error text**: bodySmall (12, 0.4, 1.33) in error `#F2B8B5` (`errorStyle`). Registration's `error:`
  widget sets `#FF5252`, keeping bodySmall's size. A trailing `\n` in the password rules leaves
  an empty last line.
- **Borders by state**: normal amber 1; focused amber 2; error unfocused → `errorBorder` if set
  (Registration: `#FF5252` 1), else `#F2B8B5` 1 (Login); **error + focused → `#F2B8B5` 2 on both
  screens** (no `focusedErrorBorder` is set). Radius 32.
- The label-shake animation runs only when a floated label's `errorText` changes; neither screen
  triggers it (Login has no label; Registration uses `error:`, not `errorText`).

**TextButton** (`text_button.dart` `_TextButtonDefaultsM3`): labelLarge; foreground primary
`#D0BCFF` (call sites override the text colour to amber); overlay primary at 0.1 pressed / 0.08
hovered; padding 12 × 8 (`_scaledPadding`, scaled with text size; the 12/8/16/8 split belongs to
TextButton.icon, which the app does not use); minimum 64×40;
stadium shape; no elevation; tap target padded to 48.

**AlertDialog** (`dialog.dart`, `_DialogDefaultsM3`): inset 40 horizontal / 24 vertical; min
width 280, wrapped in `IntrinsicWidth` (as wide as its widest child, up to screen − 80);
content padding left 24, top 16, right 24, bottom 24 (no title/icon passed, so the top scales
with text size); elevation 6 but shadow and surface tint transparent (**no shadow**); content
text style bodyMedium. Barrier `Colors.black54`. Enter and exit: **fade only, 150 ms,
`Curves.easeOut`**. Not dismissible by tapping the barrier (`barrierDismissible: false`).

**CircularProgressIndicator** (`progress_indicator.dart`; `year2023` defaults true):
**36×36**, stroke **4** centred on the radius, colour primary **`#D0BCFF`**, square stroke cap,
no track. Indeterminate motion: path cycle **1333 ms**, rotation cycle **2222 ms**; head =
`fastOutSlowIn` over the first half of the path cycle, tail = `fastOutSlowIn` over the second
half; `arcStart = −π/2 + tail·1.5π + rotation·2π + offset·0.5π`, `arcSweep = max((head −
tail)·1.5π, 0.001)`.

**FloatingActionButton** (Login / Registration back button; `_FABDefaultsM3`): 56×56, radius 16,
elevation 6; the call site makes the background transparent, so the arrow takes the default
foreground **onPrimaryContainer `#EADDFF`** (pale lavender) and the splash is that at 0.1. The
elevation shadow still draws under the transparent fill. Measured on the RMX5070 (2026-10-13):
the button's square moved down 5.8, Gaussian blur σ 3.67, black at 0.24. RN shows it as a pre-drawn image
(`scripts/make-fab-shadow.py` → `assets/images/fab_shadow*.png`), identical on every platform.

**Tooltip** (`material/tooltip.dart`, `widgets/raw_tooltip.dart`): used by the auth FAB ('Back')
and every `IconButton(tooltip:)`. Long press 500 ms shows it, plays `Feedback.forLongPress`
(Android: `performHapticFeedback(LONG_PRESS)`; iOS: click sound + heavy impact) and wins the
gesture arena, so the button's tap is cancelled. Dark theme: white at 0.9, radius 4, padding
16 × 4, minHeight 32, text bodyMedium 14 black. Position: target centre + 24 below (above if only
that fits), centred, 10 from the edges. Fade in 150 ms `fastOutSlowIn`, out 75 ms; stays 1.5 s
after the finger lifts. The FAB's pressed highlight is the theme `highlightColor` `#40CCCCCC`.

**Icon** (`widgets/icon.dart`): `SizedBox(size) → Center → RichText(overflow: visible)`. The
text gets at most `size` of width, so a glyph narrower than the box is centred, and a wider one
starts at the box's left edge and spills right. Font Awesome's `arrowLeftLong`, `eye` and
`eyeSlash` are 1.125 em wide; `clipboardList` is 0.75 em.

**Scaffold and the keyboard** (`scaffold.dart`, `editable_text.dart`): `resizeToAvoidBottomInset`
is true by default, so the body ends at the top of the keyboard (`viewInsets.bottom`) and a
`SafeArea` inside loses its bottom padding. The FAB does not move. The focused field then keeps
its caret line visible in the enclosing scroll view: the line inflated by `scrollPadding` 20 all
round, except below on Android, where the selection handle makes it `max(15 + 48/2, 20)` = **39**.
The smallest scroll that shows it: a jump while the keyboard opens, 100 ms `fastOutSlowIn` when a
field gains focus. Android's caret spans the line; iOS's is 2 taller and centred.
RN: `src/components/layout/` — `Scaffold`, `SafeArea` and `RevealingScrollView` follow the
keyboard frame by frame through react-native-keyboard-controller (the per-frame insets Flutter's
engine reads) and Reanimated (layout and scroll on the UI thread), so the form moves in step with
the keyboard as in Flutter.

**ModalProgressHUD** (`modal_progress_hud_nsn 0.5.1`): `Stack[child, BackdropFilter(blur 0,
Opacity(0.3, ModalBarrier(grey #9E9E9E, not dismissible))), Center(CircularProgressIndicator())]`.
The barrier expands to the HUD's maximum size and blocks taps. Note the Stack aligns its child
top-start: see Q47.

## 4. Tokens and decorations

- Palette: see spec 00.
- `kTextFieldDecoration`:
  - `hintText 'Enter a value'` (screens override it)
  - `labelStyle: white70`
  - `contentPadding: vertical 10, horizontal 20`
  - `border: OutlineInputBorder(radius 32)`
  - `enabledBorder: amber 1.0, radius 32`
  - `focusedBorder: amber 2.0, radius 32`
  - Error borders are not set, so they use the Material 3 default error colour unless a screen
    sets `errorBorder`.
- Common recurring spacing: page inset 20; the "back arrow row" pattern is an `IconButton`
  (FA arrowLeftLong) aligned left with padding `fromLTRB(10, 0 or 25, …)`.

## 5. Popup dialog: `showPopupMessage` (`components/popups.dart`)

Signature: `title`, `message`, `okayButtonLabel?`, `onOkay?`, `cancelButtonLabel?`, `onCancel?`,
`body?`, `icon` (default FA circleExclamation), `showCancel?`.

- `renderCancel = showCancel ?? (cancelButtonLabel != null || onCancel != null)`.
- `showDialog(barrierDismissible: false)` with `AlertDialog(backgroundColor #25282A, shape
  radius 16)`. Content is a `SingleChildScrollView(Column(min))`:
  1. Icon (amber, 48), padding bottom 16
  2. Title (20, bold, white, centred), padding bottom 12
  3. Message (14, `#A2AAAD`, height 1.4, centred, soft-wrap), padding bottom 24
  4. Optional body, padding bottom 16
  5. Buttons:
     - Two buttons: Row of `Expanded(padding right 8)` with Material elevation 3, `#54585A`,
       radius 32, MaterialButton (`minWidth ∞`, height 10), Text(cancel or "Cancel", white 16
       w600); then `Flexible(padding left 8)` with Material elevation 3, `#6787B7`, radius 32,
       Text(okay or "Okay", `#25282A`, 16 w600).
     - One button: centred Material elevation 3, `#6787B7`, radius 32, MaterialButton
       `minWidth 200`, "Okay".
- Default handlers call `Navigator.pop(context)`. Custom `onOkay` / `onCancel` handlers must pop
  themselves.
- An empty title or message still renders its padding (Test Connection uses "" for both).
- `showGenericErrorPopup`: "An error occurred." / "Please try again. Contact support if errors
  persist."

Measured on the RMX5070 (2026-10-14): showDialog's `useSafeArea: true` centres the dialog inside
the safe area (its centre 13 px above the screen's there), and an empty title or message keeps
one line of font size × height (title 20 × 1.43, message 14 × 1.4). See PARITY_ISSUES P22, P23.

## 6. Toasts

- **`showToastPopup(context, message, color, icon, shouldDismiss)`** (toastification 2.3.0):
  - `toastification.dismissAll()` first
  - `type info`, `style flat`, white icon, description `Text(message, white)`
  - alignment top-centre, background and foreground `color`, margin `fromLTRB(0, 50, 0, 0)`
  - no progress bar, auto-close **5 s**, `FadeTransition` animation, `dragToClose`
  - The `shouldDismiss` argument is ignored.
  - Replicate the flat style's padding, radius, border, close button and shadow from the package
    source.
- `showSuccessfulToastPopup` = `#54585A` + FA circleCheck. `showFailedToastPopup` = `#54585A` +
  `Icons.error_outline`.
- Screen-local helpers (`showSuccess`, `showError`, `showInfo` in DeviceView, DeviceSettings,
  DeviceMeta and AccountSettings) call `showToastPopup` in a `Timer.run`:
  - success: `#54585A` + Cupertino `check_mark_circled_solid`
  - info: `#E7EDFB` + `Icons.info_outline`
  - error: `#54585A` + `Icons.error_outline`
- **"teast" banner** (`components/teast_popups.dart`; used by SensorView "Pair Sounder"):
  `showGeneralDialog` (not dismissible, 200 ms transition) with a top-aligned container (radius
  10, width screen − 40, height screen / 9, padding 5): Row[Icon 30, 15, Flexible Text(white, no
  decoration)]. Auto-pops after **4 s** when `shouldDismiss`.
  - success: `#54585A` + `Icons.check_circle_outline` (white)
  - error: `#54585A` + `Icons.error_outline`
  - info: `#E7EDFB` + `Icons.info_outline` in `rgb(54,105,214)` (unused)

## 7. Buttons

- **RoundedButton**:
  - `Padding(padding ?? vertical 8)` → `Material(elevation 5, color: onPressed != null ?
    buttonColor : #A2AAAD, radius 32)` → `MaterialButton(minWidth 200, height 45)` →
    `Padding(5)` → Row(centred) of [icon?, 20 gap if icon, `Flexible(Text(title ?? "",
    color: buttonTitleColor))`, trailing icon (padding h15) when `showTrailingIcon`].
  - Default icon size 24, colour `iconColor`. The label uses the MaterialButton text style
    (labelLarge 14 w500).
  - In the parent Column, buttons stretch when the column uses `crossAxisAlignment.stretch`, as
    on the auth screens. Otherwise they are 200 minimum and sized to content.
- **RoundedLoader**: `Padding(padding ?? vertical 16)` → Material(elevation 5, amber, radius 32)
  → Container(h45, **w350**) → centred 24×24 CircularProgressIndicator(white, stroke 3).
- **ToggleButton**: `TextButton` with amber background (default), radius 30, padding 2, Row[Icon
  black 18, 8, Text black 14].
- **ScalableButton**: text (14, centred, width = full-screen-button width), a gap of
  `fontSize/2`, then a ToggleButton (FA circleXmark) at that width. Currently unused by screens;
  port it anyway.
- **Auth back FAB**: `FloatingActionButton(tooltip 'Back', backgroundColor transparent, child
  FA arrowLeftLong)` at `FloatingActionButtonLocation.startTop`, with padding v24 h8. Disabled
  while submitting.

## 8. Switches

- **AutoSwitch(processTap, boolController | value)**: Material `Switch(activeThumbColor: amber,
  value, onChanged)`. On tap: set the value immediately (optimistic), `await processTap(v)`.
  - Failure → revert the value, then `showFailedToastPopup(messages.first or "Failed to
    switch.")` if still mounted.
  - Success → `showSuccessfulToastPopup(result.data)`.
- **SynchronizedAutoSwitch<Model>(obj, getOnObject, setOnObject, processTap)**: two-way binds a
  model field. Setting the value writes the model and triggers a rebuild; a model change updates
  the switch.

## 9. Scaffold, app bar and navigation

- **AppScaffold(body, actions=[], floatingActionButton?, showNavigation=true)**:
  - `LayoutBuilder` → `Scaffold(drawer: showNavigation && width ≤ 800 ? NavBar : null, fab,
    appBar: AppBar(leading: null, title: Center(Image(cartelldigitalreverse.png, contain, h45)),
    backgroundColor #25282A, actions), body: Row(crossAxisStart, mainAxisCenter, [if
    showNavigation && width > 800: NavBar, body]))`.
  - With a drawer, AppBar shows the hamburger automatically. Without one (pairing, firmware
    progress), there is no leading widget.
  - Screens pass `actions` (X button, kebab menu, or `SizedBox(width: 35/40/48/50)` to balance
    the centring), so the **logo position varies per screen**. Reproduce each screen's actions
    exactly.
- **NavBar**: spec 10 §1.
- **EnvBanner**: spec 02 §4.
- **PopupMenuButton** (kebab FA ellipsisVertical, Ellipsis "Add Hub", SensorEllipsis "Pair
  Sensor"): the items are `PopupMenuItem(child: ListTile(leading: Icon, title: Text, onTap))`.
  Because the ListTile consumes the tap, **the menu does not close by itself**, so handlers call
  `Navigator.pop` first where the code does. Delete Hub opens its dialog on top of the still-open
  menu (spec 10).

## 10. Display components

- **KeyValuePairDisplay(keyStr, valueStr, fontSize=14)**: padding v15 h20.
  - If `getScalingFactor(14) < 1.5`: Row spaceBetween [Text(key, centred, fontSize), Text(value,
    centred, fontSize)].
  - Else Column(start) [Text(key, 14, `#A2AAAD`), Text(value, fontSize)].
- **ReusableCard(cardcolor, cardChild, onPress, showThing, thingColor, icon)**: tap area with a
  rounded box (radius 20). `showThing` adds a 30×30 badge (radius 15) at top −5, right 25,
  inside margin 15. Not used with `showThing` today.
- **ReusableListing(listicon, iconcolor, iconsize, fontcolor, fontsize, labelvalue, textvalue,
  onPress)**: if `scale(15) ≤ 1.5`, Row spaceBetween [Row[Icon, 20, Text(label)], 10,
  Flexible(Text(value))]; else a Column version. `fontcolor` is accepted but **not applied**.
- **IconButtonRowEntry(isEnabled, onTap, iconData, label)**: translucent tap area, padding h5
  v20. Icon 40 (`#6787B7` enabled / `#54585A` disabled) with padding h10 v12. Label centred
  (white / `#54585A`). When disabled, the tap does nothing.
- **ThreeButtonRow(children)**: if `scale(14) < 1.5`, Row spaceAround with each child limited to
  max width 70 (padding h5); else a Column with padding v10.
- **ResponsiveSpacer(child, normalSpacing 0, sidePaddingPercent 0.10)**: when width > 500,
  horizontal padding is width × percent.
- **AdditionalInfoField(title, additionalInfo)**: a box (black border, radius 10, `#54585A`,
  padding 8). Row spaceBetween [Flexible Text(title, 16), IconButton(FA caretRight /
  caretDown)]. Expanded adds a Row with `Flexible(Text(info))`.
- **SensorFlaggedBanner**: spec 13.
- **HubStatusGlyph(device, refresh)**:
  - Stack centred: FA towerBroadcast 90 inside a SizedBox w150 with padding v15. Colour is
    `#A2AAAD` while checking, amber when connected, `#54585A` when disconnected.
  - Badge (not while checking): FA check / xmark, 45, same colour, padding `fromLTRB(70, 70, 0,
    0)`.
  - Label (17; `#A2AAAD` while checking, else white, centred):
    - checking: "Status: Checking..."
    - ready: "Status: Connected" / "Status: Disconnected"
    - failed: "Status: Last known connected" / "Status: Last known disconnected"
- **FriendlyErrorView(error, onRetry?, onSignIn?)**: padding 24, Column(min): `Icons.error_outline`
  64 orange; 12; message, centred:
  - `AuthExpiredException` → "Your session has expired. Please sign in again."
  - `AccountFetchFailedException` → "We couldn't load your account information. Please try
    again."
  - else "Something went wrong. Please try again."

  Optional TextButtons "Sign In" (AuthExpired only) and "Retry".
- **ConditionalViewWidget(child, shouldRender)**: a FutureBuilder that shows the child only when
  the future resolves to true. Note that it **re-runs the future on every rebuild**.
- **IconContent**: Icon 80, 15, Text(label, kLabelTextStyle). Unused.
- **Badge** (`badges 3.2.0`): `showBadge`, `badgeStyle.padding` zero (or `fromLTRB(0, 70, 10,
  0)` on the hub-detail Sensors button), `badgeContent: SizedBox(40×40)` or (10×10),
  `stackFit.passthrough`. Default badge colour is red and the shape a circle; the default
  position is top-end. Read the package defaults.

## 11. Progress and animation

- **SpinKitRing** (Load screen; white; default size 50, lineWidth 7, 1200 ms), **SpinKitPulse**
  (110, white), **SpinKitFadingFour** (white, default size 50). Port each from the
  `flutter_spinkit 5.2.2` source (curves and timing).
  - SpinKitRing, from `ring.dart`: per cycle t, the whole box turns t·5π/6; the arc starts at
    π·(−2/3, then linear to 1/2 over the second half) and sweeps 2π·(0.25 → 5/6 → 0.25, a
    triangle peaking at t = 0.5); square caps, stroke centred on radius (size − lineWidth)/2. The
    angles meet at the wrap, so there is no jump. RN: `src/components/progress/SpinKitRing.tsx`.
  - RN draws every arc spinner (this and CircularProgressIndicator) with
    `src/components/progress/AnimatedArc.tsx`: an SVG path recomputed on the UI thread each
    frame (Reanimated frame callback), from the elapsed time, as Flutter's ticker repaints.
- **AppBar** (Load, Maintenance, the main shell, Add Location): Material 3 defaults, elevation 0,
  toolbar 56 dp below the status bar, the background colour filling the status bar too. The title
  goes 16 dp from each side (NavigationToolbar.kMiddleSpacing), start-aligned on Android and
  centred on iOS, vertically centred; the logo title is `Center(Image h45, contain)`. The status
  bar icons follow `estimateBrightnessForColor(background)` (light on `#25282A`), and the style
  persists after the bar goes, since no other screen sets one. Under an app bar the Scaffold body
  gets no top padding. RN: `src/components/layout/AppBar.tsx`.
- **ModalProgressHUD(inAsyncCall)**: an overlay barrier plus a centred indicator when true. Read
  the `modal_progress_hud_nsn 0.5.1` defaults (opacity, colour, indicator, dismissible).
- **HubLightWidget(pattern, semanticLabel)**:
  - A 45×45 circle with a 5 px white border, filled with the current pattern colour.
  - Each segment shows for its duration via a timer chain, then loops. Every widget instance has
    its own sequence starting at index 0, and parent rebuilds do not restart it.
  - Reduce Motion shows a static first lit colour.
  - Semantics: image with the label.
  - The "off" colour is `#25282A`.

  | Pattern | Name | Description | Sequence |
  |---|---|---|---|
  | `hubLightWifiAccessPointMode` | "Wi-Fi Pairing Mode" | "Waiting to be given a Wi-Fi network to join." | lightGreen 60 ms, off 3000 ms |
  | `hubLightConnectedToServer` | "Connected to Server" | "Everything is set up correctly." | lightGreen 1000 ms (solid) |
  | `hubLightConnectedToWifiButNotServer` | "Connected to Wi-Fi, But Not Server" | "On your network, but not reaching us. Usually that network has no internet." | lightBlue (solid) |
  | `hubLightNotConnectedToWifi` | "Not Connected to Wi-Fi" | "Cannot find the network it was set up with." | green 1 s, off 1 s, blue 1 s, off 1 s |
  | `hubLightPairingMode` | "Sensor Pairing Mode" | "Waiting for a new sensor to connect." | lightBlue 1 s, off 1 s |
  | `hubLightResetting` | "Resetting to Factory Defaults" | "Currently deleting all on-device settings. (Reset button is being held in.)" | red 100 ms, off 100 ms |
  | `hubLightUnknown` | "Unknown Mode" | "Unknown state. Please call support." | red (solid) |

- **TimedPullToRefresh(onRefresh, child)**: `LiquidPullToRefresh(animSpeedFactor 5, height 40,
  showChildOpacityTransition false, colour amber, background #25282A)`. `onRefresh` waits **2 s**
  before calling the callback. Replicate the liquid drop animation from the package source.

## 12. Bottom sheet: `showCupertinoModalPopup` + `CupertinoPopupSurface`

Used by the debug menu (spec 08 §2) and the feedback sheet (spec 11 §6). Resolved from the
Flutter 3.41.9 source (part 11, 2026-10-14; `cupertino/route.dart`, `cupertino/dialog.dart`) and
ported in `src/components/popups/CupertinoModalPopup.tsx`:

- **Placement**: Align.bottomCenter with loose constraints; the child slides up by its own height
  (FractionalTranslation from Offset(0, 1)).
- **Motion**: not a duration and curve but a spring, `SpringDescription(mass 1, stiffness 522.35,
  damping 45.7099552)`, critically damped, started at velocity 0 in both directions (also when a
  slide reverses mid-way), done within 1e-3 of the end and below 0.03/s, then snapped to the end.
  A full slide takes 405 ms. With v0 = 0 the path is a fixed curve, so RN runs it as a timing
  animation on the native driver with that curve as the easing.
- **Barrier**: kCupertinoModalBarrierColor, dark `0x7A000000` (light `0x33000000`), faded in with
  Curves.ease on the route animation. Dismissible by tapping; Android Back closes it; excluded from
  screen readers.
- **Surface**: ClipRSuperellipse radius **13** (RN: borderCurve continuous on iOS, a circular
  corner on Android: measured within 1 px of Flutter's at 3×), surface colour `0xCC2D2D2D` dark,
  backdrop blur σ 30 with a saturation filter. The blur only shows through a see-through child;
  the debug menu's child is opaque, so RN leaves it out.
- **Measured** on the RMX5070 (Flutter, 2026-10-14): barrier turns `#0A0E21` into `#05070F`
  (alpha 0.478); the debug panel's top edge sits at 80 dp, full width, reaching under the
  navigation bar.

## 13. QR scanner (`components/forms/qr_scanner.dart`)

Spec 15 §3.
