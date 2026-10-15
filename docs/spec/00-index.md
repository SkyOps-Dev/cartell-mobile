# Flutter App Specification: Index and Conventions

These files describe what the Flutter app (`frontend/`, baseline `1.12.5+193`) does, part by
part, so that each step of `../../PORTING_PLAN.md` has a precise target. They were written from a
complete read of `frontend/lib` (266 files), the native shells, the env files, the 574 tests and
the release tooling on 2026-10-05.

**The Flutter source remains the authority.** Before each plan step, re-read the files the step
lists and correct these specs where they are wrong.

A plain-language companion organised by feature and use case lives in
[`../features/README.md`](../features/README.md).

## Conventions used in these specs

- File paths without a prefix are relative to `frontend/lib/`.
- Colours are given as hex, and named constants refer to `utilities/constants.dart`:

  | Constant | Hex | DESIGN.md name |
  |---|---|---|
  | `kCartellBlack` | `#25282A` | Asphalt |
  | `kCartellBlue` | `#6787B7` | Dusk Blue |
  | `kCartellYellow` | `#FFB500` | Signal Amber |
  | `kCartellDarkGray` | `#54585A` | Deep Gravel |
  | `kCartellLightGray` | `#A2AAAD` | Gravel |
  | `kCartellAppScaffoldColor` | `#25282A` | Asphalt (app bar, dialogs) |
  | `kActiveCardColor` | `#1D1E33` | Surface Card |
  | `kInactiveCardColor` | `#111328` | Surface Sunken |
  | `kCartellAlertRed` | `#FF5252` | Alert Red Accent |
  | `kCartellStatusGreen` | `#69F0AE` | Status Green Accent |
  | scaffold background (`main.dart`) | `#0A0E21` | Night Ground |
  | `Colors.red` | `#F44336` | Alert Red |
  | `Colors.green` | `#4CAF50` | Status Green |
  | `Colors.redAccent` | `#FF5252` | |
  | `Colors.greenAccent` | `#69F0AE` | |
  | `Colors.deepOrange` | `#FF5722` | |
  | `Colors.orange` | `#FF9800` | |
  | `Colors.lightGreen` | `#8BC34A` | |
  | `Colors.lightBlue` | `#03A9F4` | |
  | `Colors.white60` | `#FFFFFF` at 60% | |
  | `Colors.white70` | `#FFFFFF` at 70% | |
  | `Colors.grey[850]` | `#303030` | |

- Sizes are logical pixels (Flutter dp / RN points) unless the spec says *physical*.
- "FA x" means Font Awesome icon `x` from `font_awesome_flutter 10.10.0`, which bundles the **Font Awesome 7** Free fonts (checked 2026-10-12). "Icons.x" means a
  Material icon. "Cupertino x" means `CupertinoIcons.x`.
- Every user-visible string is quoted **verbatim**, including typos and odd spacing such as
  "An Error Occured" or "Spash Page". Never correct copy during the port.
- "Popup" means `showPopupMessage(...)` (spec 07 §5). "Toast" means `showToastPopup(...)`
  (spec 07 §6).

## Parity rules (apply to every step)

1. **As built, not as intended.** DESIGN.md records many "As built" deviations, such as amber
   borders on every field, a Deep Gravel glyph for a disconnected hub, red event labels, and the
   lavender debug button. The port reproduces what ships. Changes go through the quirk register.
2. **Code beats docs.** For example, DESIGN.md's firmware-screen section describes an older
   layout than `available_firmware_updates_screen.dart`.
3. **Platform-specific behaviour is replicated per platform.** Flutter itself behaves
   differently on iOS and Android in places: iOS centres the app-bar title by default, uses San
   Francisco, uses Cupertino page transitions for pushed routes, shows "Join" vs "Connect" in the
   Wi-Fi prompt, and on Account Settings the switch rows have 0 horizontal padding on iOS versus
   20 on Android.
4. **Exact copy, exact error codes.** Sentry markers like `"Error Code 4f0ef:"` are kept so
   dashboards and runbooks keep working.
5. **Same network traffic.** Same endpoints, methods, bodies (form-urlencoded), headers
   (`Authorization: JWT <token>`) and ordering (a maintenance probe precedes every request).
6. **Timers and durations are part of the spec**: 300 ms cross-fades, 15 s polls, 2 s
   pull-to-refresh delay, 60 s auth cache, and the pairing constants.

## Glossary

| Term | Meaning |
|---|---|
| Hub / Device | The physical hub. App model `Device` (registration) wraps `DeviceMeta` (the produced device). |
| Sensor | A wireless vehicle sensor paired to a hub; `sensor_type == "ON"` is the hub's onboard sensor. |
| Event / Results | An activation-log page (`Event`) and its rows (`Results`). |
| Bloc | A flutter_bloc state machine. This app uses blocs **for navigation**: the screen shown is a function of the bloc state. |
| Back-stack | `GenericBloc.stack`: the custom stack of previous states used by "go back N" events. |
| RefreshState | `checking` / `ready` / `failed`, used where a screen renders cached data and then revalidates. |
| Pairing | Provisioning a hub's Wi-Fi over UDP on the hub's own access point (spec 16). |
| AP | The hub's setup access point `Cartell Hub <MAC>` at `192.168.4.1`. |
| Mode | `NORMAL` / `MAINTENANCE_MODE` / `UNREACHABLE` server reachability (spec 04 §2). |
