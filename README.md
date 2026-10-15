# Cartell — React Native

React Native copy of the Flutter app in `../frontend/`. The goal is an app users cannot tell
apart from the Flutter one. `PORTING_PLAN.md`, `PORTING_PARTS.md`, `PORTING_TIMELINE.md` and
`docs/` describe the work.

React Native 0.87.1 (bare, TypeScript, New Architecture, Hermes). Node 22.13+ or 24.3+, JDK 17.

## Pick the server first

Every build reads one environment file from `envs/`, as the Flutter app does with
`--dart-define-from-file`. The script writes the chosen one to the gitignored
`src/config/env.generated.json`. See `envs/README.md` (including how to create `envs/dev.json`).

```bash
npm run env:dev        # http://<LAN IP>:8000, the backend on your computer
npm run env:test       # https://test.cartellap.com
npm run env:beta       # https://beta.cartellap.com
npm run env:live       # https://cartellap.com — real customers
npm run env:simulator  # localhost:8000, Wi-Fi hop in pairing skipped

# Override single keys, like --dart-define:
node scripts/use-env.js dev baseDomain=192.168.1.50:8000
```

Re-run it after switching, then reload the app.

## Run on an Android phone (wireless debugging)

```bash
npm start                        # terminal 1: Metro, the JS server — leave it running

adb connect <IP>:<port>          # terminal 2
npm run android:rn               # side-by-side copy (com.iwatllc.cartell.rn, "Cartell RN")
npm run android                  # the real id (com.iwatllc.cartell) — replaces the Flutter app
```

- The install commands never start Metro themselves (`--no-packager`). On Windows the CLI fails
  to recognise an already-running Metro as this project's (it compares `C:/…` with `C:\…`),
  starts a second one on 8082, and the two clash, leaving the app on the splash forever.
- Debug builds carry no JS (the standard React Native setup): the app loads its code from Metro
  every time it opens, so Metro must be running and reachable or the app stays on the splash.
  Unlike a `flutter run` APK, it cannot run on its own. Only release builds embed the JS.
- The phone reaches Metro through `adb reverse tcp:8081 tcp:8081`, which the install commands
  set up. Wireless debugging forgets it whenever the connection drops (phone sleeps, Wi-Fi
  changes, PC restarts; the port on the phone's Wireless debugging screen changes too). Then:
  `adb connect <IP>:<new port>`, `adb reverse tcp:8081 tcp:8081`, and reopen the app. Or, in the
  in-app developer menu (shake, or `adb shell input keyevent 82`), set **Settings → Debug server
  host** to `<PC IP>:8081` to reach Metro over Wi-Fi with no adb tunnel.
- The first launch downloads about 4 MB of JS over Wi-Fi (around 40 s). The splash stays up
  until it arrives, as in Flutter, so it can look stuck; Metro's window shows progress.
- A wirelessly connected phone can appear twice in `adb devices` (by IP and as
  `adb-…._adb-tls-connect._tcp`). If a command says "more than one device", add
  `--deviceId <IP>:<port>`.

`android:rn` installs next to the Flutter app, so both can be compared on one phone. It exists
only for development and is never shipped.

For the dev server, start the backend as you do for Flutter (`runserver 0.0.0.0:8000`). Debug
builds allow plain `http`; release builds do not (see `docs/spec/01-platform-shell.md` §3.4).

## iOS

Needs a Mac with Xcode: `cd ios && pod install`, then `npm run ios`. The iOS project is written
to match the Flutter one but has not yet been built (no Mac in the current setup).

## Checks (run before handing work over)

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

Each Jest test ported from Flutter names its source at the top:
`// Ported from frontend/test/<path>`.
