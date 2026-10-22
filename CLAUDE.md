# Cartell React Native port: start here

You are joining a long-running job: porting the Cartell Flutter app (`../frontend/`) to React
Native, in this folder. Read this file in full before doing anything. It tells you what the job
is, where it stands, how the developer wants to work, and where the detail lives.

Also binding: the repo-root `../CLAUDE.md` (operational guardrails) and `../project/CLAUDE.md`
(project notes, including RN gotchas found so far).

## 1. The job

- **Goal:** a React Native app that users cannot tell apart from the shipping Flutter app
  (baseline `1.12.5+193`). That covers every screen, word, animation and timing, every API call
  in the same order, the same Sentry error codes, and the same platform behaviour.
- **Quirks are copied, not fixed.** The bar is "as built": copy what the Flutter code actually
  does, bugs included. Nothing is improved, restyled or cleaned up. Known Flutter bugs and quirks
  are in `docs/spec/19-quirks-register.md`; a fix needs the client's approval.
- **The Flutter code is the reference.** Where a doc disagrees with `../frontend/lib/`, `lib/`
  wins. Visual values that `lib/` doesn't set are taken from the Flutter 3.41.9 SDK and package
  source at the locked versions, or measured on the phone. Never guess them.
- **`../backend/` and `../frontend/` are never modified.**
- **The Node backend port runs side by side with this one** (since 2026-10-19), in
  `../node_backend/` (start at its `CLAUDE.md`). Each RN step is ported against Django first; the
  Django endpoints it uses are then ported to Node **one at a time**. The env holds both
  addresses (`baseDomain` → Django `:8000`, `nodeBaseDomain` → Node `:8001`).
  `src/config/environment.ts` has `baseUrlHttp()` and `nodeBaseUrlHttp()`, and moving an
  endpoint is a one-line change at its call site. The ledger of call sites is
  `../node_backend/docs/ENDPOINTS.md`. `nodeBaseUrlHttp()` falls back to Django's address when
  the env has no `nodeBaseDomain`, or when the Debug Info panel has switched servers.
- **Stack:** React Native 0.87.1, bare community CLI, TypeScript, New Architecture (Fabric),
  Hermes. Node 22.13+ or 24.3+, JDK 17. Developed on Windows; there is no Mac yet.

## 2. How the developer wants to work (standing rules)

1. **Explain each new step first, then stop and wait for the go-ahead.** Describe in plain words
   what the user will see, what Flutter does, what RN will build, any native code, and any
   decisions. Write no code until the developer replies. Even "yes, and tell me what's in it"
   means: explain first, build second.
2. **Re-verify every part before building it.** Re-read every Flutter source file for the part
   and its `docs/spec/*` section. If the spec is wrong, fix the spec first. Then run
   `npm run later -- N` to collect the work earlier parts left for this one.
3. **Be thorough.** Read Flutter sources in full rather than sampling. The developer prefers
   comprehensive lists to short ones, and nothing may be missed.
4. **Mirror Flutter's component structure.** Before creating a UI component, grep
   `../frontend/lib` for how Flutter builds it. If Flutter has a shared widget, make one shared
   RN component. If Flutter inlines it per screen, share it in RN only where the copies are
   identical.
5. **Optimise the code, never the behaviour.** The app must be as fast as possible, but with no
   difference a user could see, checked on the phone against Flutter. Performance work never
   makes the code worse: optimisations go inside shared components and the theme, and names and
   folders explain the app. Practices and measurements are in `docs/PERFORMANCE.md`.
6. **Write both platforms.** Native code gets its Android (Kotlin) and iOS (Objective-C `.m`)
   halves in the same change, ported from what Flutter's plugin or engine does on each.
   - No Mac means "written, not yet built on iOS". It never means "unwritten".
   - Register each new iOS file in `ios/Cartell.xcodeproj/project.pbxproj` by hand.
   - Record the iOS half as "to verify" in `docs/PARITY_ISSUES.md`.
   - Tell the developer up front when native code is needed.
7. **Mark everything left for later.** Anything a part deliberately leaves to a later part is
   marked `// LATER(part N): <what Flutter does here>` at the exact spot, using the
   timeline's part numbers. `npm run later` lists them all; `npm run later -- N` lists one part.
   A part is done only when that command prints "nothing left".
8. **Report honestly.** Separate measured from assumed, and verified from merely built. Phone
   checks the developer did by hand count as verified. Say so when that is the source.

## 3. Guardrails (from the root CLAUDE.md, plus the developer's)

- **Ask before running CLI commands outside this project's scope** (installing tools like ffmpeg,
  touching other folders).
- **No git or GitHub actions without asking.** This folder is not a git repo on its own.
- **Never run the backend server, and never modify the database.** The developer runs the local
  Django backend and has database access in Beekeeper Studio. Give them SQL to run if needed;
  never run it yourself.
- **The developer runs Metro and installs themselves:** `npm start` and `npm run android:rn`.
  Ask first before building or installing a release build.
- **Never commit secrets.** Never write to `../backend/tools/` or `../backend/envs/`.
- **On the phone, never change the Flutter app's server setting.** An adb tap once switched it
  to LIVE by mistake. Force-stopping and relaunching it returns it to DEVELOPMENT.

## 4. The plan documents

| File | What it is |
|---|---|
| `PORTING_TIMELINE.md` | The **37 parts**. The team uses **this numbering**, and so do the `LATER(part N)` markers. |
| `PORTING_PLAN.md` | The master checklist by phase (Phase 0–20, steps like 7.7), decisions D1–D13, and §1 "How to work a step". Status marks: `[ ]` not started, `[~]` in progress, `[x]` done, `[-]` not done on purpose. |
| `PORTING_PARTS.md` | An older breakdown into 35 parts with its *own* numbering. Don't confuse it with the timeline. |
| `docs/spec/00-index.md` … `23-*.md` | Build-level specs, written from a full read of the Flutter code on 2026-10-05: platform shell, environments, networking, models, state and navigation, design system, auth, quirks (19), tests inventory (20), file coverage matrix (22), screen catalogue (23). |
| `docs/features/*.md` | Plain-language feature descriptions (01–32, A1–A6), for explaining things to the developer. |
| `docs/PARITY_ISSUES.md` | Rows P1–P30: every place where RN was seen to differ from Flutter, with the measurement and its status. **Add a row whenever you build or verify something on the phone.** |
| `docs/PERFORMANCE.md` | Performance rules and measured fixes. |
| `README.md` | How to pick a server, run on the phone, and run the checks. |

After any Flutter change, run `node docs/spec/tools/generate-coverage-matrix.js`.

## 5. Where things stand (2026-10-22)

**Build order, set by the developer's boss (timeline numbering):** 1 → 5 → 7–13 → 3 → 4.
- Part 2 (logs and Sentry) and part 6 (navigation, side menu, Back) were **deferred** by the boss.
- **No cache for now:** Flutter's `DataPersistor` is not built, also by the boss's decision.
- Parts 3 (saved data, models) and 4 (server calls) are built only as far as sign-in needs.
  Every other model and endpoint gets built in the part that first uses it (Device model with
  part 24, Sensor with part 31, and so on).

**Done (the sign-in and registration phase):** parts 1, 5 (only what these screens use), 7
Register, 8 Log in, 9 Biometric unlock, 10 App start and auto sign-in, 11 Welcome and Debug
Info, 12 Log out, 13 Maintenance and "can't reach Cartell".
- All checked on the developer's Android phone. Most screens were measured side by side
  against Flutter; see PARITY_ISSUES.
- **iOS has never been built** (no Mac). Pending a Mac: the whole iOS project, plus the native
  files `ios/Cartell/FeedbackModule.m`, `PackageInfoModule.m` and `LocalAuthModule.m`.
- Open question: in the debug build the Debug panel's close starts about 65 ms later than
  Flutter's. Re-check in a release build, which needs the developer's OK.

**In progress (2026-10-15): the shell and the Hubs screen** (part 6 in part, part 24's empty case).
- Built: after sign-in the app goes to the Hubs screen (MainAppBloc → DevicesBloc, loading
  screen then "No Hubs have been added."), the app bar with the hamburger and the ⋮ menu ("Add
  Hub"), the yellow + button, the side menu (drawer up to 800 dp, inline rail above) with the
  user's name and email, "Leave App" on Back. The placeholder screen is gone.
- The developer's scope for this step: the Hubs screen always shows the empty card; the + button,
  "Add Hub", Account Settings, Event History, Help and **HUBs** do nothing yet (HUBs is part 6
  work left on purpose); only Log Out works. Pull-to-refresh waits for part 24.
- The side menu's user comes from a stand-in for `DataPersistor<User>`
  (`src/services/data/userPersistor.ts`, filled by `setUser`), marked LATER(part 6) wherever
  it is read or written, because the cache is still put off.
- Not yet checked on the phone against Flutter: PARITY_ISSUES P25–P30. The Source Sans Pro font
  is new in the Android assets, so this needs `npm run android:rn`, not just a Metro reload.

**Node backend (2026-10-19 → 2026-10-21):** the sign-in phase's six endpoints are on Node
(`../node_backend/docs/ENDPOINTS.md`). `nodeBaseDomain` (in `envs/dev.json` only) and
`nodeBaseUrlHttp()` came with that work.

**Account Settings (parts 21, 22, 23): built 2026-10-21, checked on the phone 2026-10-22.** The side menu's
Account Settings entry now works. Built from the Flutter source, against Django, in the order
the developer agreed: screens first on Django, then the endpoints move to Node one at a time
(`GET /app/settings/`, `PATCH /auth/users/me/`, `POST /auth/users/set_password/`, the profile
GET and PATCH); `DELETE /auth/users/me/` stays on Django until the hub WebSocket layer moves.
- Screens: Account Settings and its skeleton, Edit Name, Edit Phone, Change Password, the Delete
  Account popups (`src/screens/account/`). MainAppBloc has the four states and events, and a
  `MainAppBlocContext` (the side menu reads it).
- New shared pieces: the Material 3 `Switch` and `AutoSwitch`, toasts (`popups/toasts.tsx`, a port
  of toastification 2.3.0), `ReusableListing`, `ConditionalViewWidget`, `FriendlyErrorView`,
  `CircleAvatar`, `ErrorWidgetBoundary` (Flutter's grey release error box, for quirk Q30), the
  Profile and Setting models, `utilities/{textFormatters,valueNotifier,futureBuilder,
  passwordRules,dartTypeName,layoutWidth}.ts`, `theme/curves.ts`.
- New font: Font Awesome 7 Brands (the Amazon logo), so Android needs `npm run android:rn`.
- Quirks copied: Q2, Q6, Q26, Q30, Q34. Profile locations stay raw JSON until the Device model
  (LATER(part 24)).
- Jest: 490 tests pass.
- Phone check (2026-10-22): the biometrics and email switches froze the app until Android
  closed it. Reanimated's linear `withTiming` stepped just outside 0–1, and the curve bisection
  never ended on the UI thread. Fixed in `theme/curves.ts` (`clampUnit`; see project/CLAUDE.md).
  After that, the screens, edits, password change and switches worked.
- **Its endpoints are on Node** (2026-10-22): settings, the user PATCH, set_password, and the
  profile GET and PATCH (the profile pair's phone test pending). Delete Account stays on Django.

**What's next:** the developer's phone test of the profile pair, then the next part, chosen by the
developer.
Part 14 (push notifications) would complete the push-token steps in log in, app start, log out
and the Hubs screen. Open markers by part: 2 (19), 14 (10), 6 (7), 24 (7), 36 (6), 20 (4),
35 (4), 17, 18, 29, 30 (2 each), 16, 19, 26 (1 each); `npm run later` has the list.

## 6. How the code is organised

Each RN file names the Flutter file it ports in its top comment. Keep doing that.

```
index.js                 startup, in main.dart's order (env log lines, registerServices)
App.tsx                  the MaterialApp counterpart: KeyboardProvider > [PageBackHandler,
                         SafeAreaProvider > EnvBanner > ToastHost > PopupHost > [AuthRouter,
                         CupertinoModalPopupHost, PopupMenuHost, TooltipLayer]]
src/state/genericBloc.ts port of flutter_bloc's Bloc: events, concurrent handlers, states
src/state/auth/          authBloc.ts: AuthBloc, every auth state and event (ports of
                         frontend/lib/state/auth/*), AuthBlocContext
src/state/mainApp/       the signed-in shell's MainAppBloc (bloc/main_app/*), MainAppBlocContext
src/state/devices/       the hubs area's DevicesBloc (bloc/devices/*)
src/screens/AuthRouter.tsx  the current state picks the screen (Flutter's AuthBlocWidget),
                         inside a 300 ms cross-fade. Navigation is a state machine, not a
                         react-navigation stack, as in Flutter. MainAppRouter and DevicesRouter
                         do the same one and two levels down (MainAppBlocWidget,
                         DevicesBlocWidget).
src/screens/devices/     DevicesScreen (the Hubs screen)
src/screens/account/     AccountSettings (+ Skeleton), EditName, EditPhone, EditPassword
src/screens/welcome/     Load, Welcome, Login, Registration, Lock, Maintenance, TestConnection
src/screens/misc/        DebugMenu (the Debug Info panel)
src/components/          shared widgets, mirroring Flutter's: buttons/, forms/, icons/ (font
                         glyphs + advance widths in iconData.ts), ink/ (InkWell + InkSparkle
                         press splash), layout/ (Scaffold with drawer and FAB locations,
                         AppScaffold, AppBar, Drawer + DrawerController, DrawerHeader, PopScope,
                         SafeArea, keyboard insets), lists/ (ListTile, Divider), popups/
                         (showPopupMessage dialogs, CupertinoModalPopup, PopupMenu), progress/,
                         text/ (FakeBoldText), tooltip/, NavBar, Ellipsis, ReusableCard,
                         CrossFadeSwitcher, EnvBanner
src/theme/               colors.ts (the palette: kCartellBlue …), typography.ts (Material 3
                         text styles: merge, toRN, ambientTextStyle)
src/services/            secureStorage (Keychain, env-prefixed keys like TEST_access),
                         requests/ (NetworkHelper: maintenance probe before every request,
                         authRequests, userRequests…), authManager/, localAuth + biometricService,
                         autofill, feedback, packageInfo, reportError (a no-op until part 2),
                         startServices, result, exceptions, data/userPersistor (the side menu's
                         stand-in for DataPersistor<User>)
src/models/              user.ts only so far
src/utilities/           scaling.ts (text-scale thresholds), modeWatcher, modeDebouncer
src/config/              environment.ts (reads env.generated.json), hubAddress.ts
envs/ + scripts/use-env.js  `npm run env:dev|test|beta|live|simulator` writes
                         src/config/env.generated.json (Flutter's --dart-define-from-file)
scripts/later.js         `npm run later [-- N]`
```

**Native modules.** These are ports of Flutter plugins:
- Android: `android/app/src/main/java/com/iwatllc/cartell/`, registered in `CartellPackage.kt`.
- iOS: `ios/Cartell/*.m`, registered in the pbxproj by hand.
- So far: FeedbackModule (haptics and sounds), AutofillModule (password-manager save),
  PackageInfoModule (version and build), and LocalAuthModule + AuthenticationHelper (a port of
  `local_auth`: Android 1.0.56 BiometricPrompt via androidx.biometric 1.1.0, iOS 1.6.1 LAContext).
- `MainActivity.kt` restores Flutter's dark navigation-bar strip.
- Cleartext `http` is allowed in debug builds only.

## 7. Tests and checks

Run these before handing work over:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
npm run later -- N      # for the part you worked on: must print "nothing left"
```

- Jest + React Native Testing Library. A test ported from Flutter names its source at the top
  (`// Ported from frontend/test/<path>`).
- `__tests__/helpers/fakeServer.ts` fakes the backend in tests only. The app itself always calls
  the real backend; there is no fake server in the app.
- `jest.setup.js` holds stand-ins for the native modules.
- `__tests__/native/` checks native wiring (Gradle dependency, registration, pbxproj entries).
- **Jest's platform defaults to iOS.** Pin Android-specific tests with
  `jest.replaceProperty(Platform, 'OS', 'android')`.
- **A press hangs if its handler returns a promise.** Async `fireEvent.press` awaits the
  handler's return value, so write handlers with a block body:
  `() => { showPopupMessage(...); }`.
- Wrap screens that use safe areas in a `SafeAreaProvider` with `initialMetrics`.
- **`Animated.stopAnimation` callbacks never fire under Jest's native-driver mock.** Compute the
  current position analytically instead (see `CupertinoModalPopup.tsx`).

## 8. Checking on the phone against Flutter

- **The phone:** a Realme RMX5070 (1080×2400, 3× density, 120 Hz), connected over wireless adb.
  The serial changes every time it reconnects, so look it up:
  `adb devices | awk '/192\.168\.100\.28:[0-9]+\tdevice/{print $1; exit}'`
- **Two apps side by side:** the Flutter app is `com.iwatllc.cartell` ("Cartell"). The RN dev
  copy is `com.iwatllc.cartell.rn` ("Cartell RN"), installed with `npm run android:rn`. Native
  changes need that rebuild; JS changes only need Metro (`npm start`) to reload.
- **How to compare:**
  - Put the same screen up in each app and take `adb exec-out screencap -p` screenshots.
  - Measure positions, sizes and colours in pixels. The bar has been within 1–3 px.
  - For motion, take timed screencaps in the background on the phone and line them up with
    RN's log timestamps.
  - Count views with `adb shell dumpsys activity top`; check frames with `dumpsys gfxinfo`.
  - Record the result in PARITY_ISSUES.
- **Local backend:** the developer's `runserver` on their LAN IP, port 8000 (`npm run env:dev`).
  - If the maintenance screen shows in **both** apps, the host is probably missing from Django's
    `ALLOWED_HOSTS`. That is a backend fix, not an app fix.
  - To re-test registration, the developer deletes the account themselves (Django admin, or SQL
    in Beekeeper with child tables first).

## 9. Things that have bitten before

These come from `../project/CLAUDE.md`, `docs/PERFORMANCE.md` and the PARITY_ISSUES rows:
- **Android text:** set `includeFontPadding: false` to match Flutter's line heights.
- **An empty Flutter `Text` still takes one line** (fontSize × height). Render a fixed-height
  View for it.
- **`ThemeData.dark()` uses the Material 3 baseline dark scheme, not `ColorScheme.dark()`.**
  Resolve theme defaults from `theme_data.dart`.
- **Large SVGs on Android stall a frame.** react-native-svg paints at the view's own size on the
  UI thread. Draw small and scale up (`InkSparkleWave.tsx`).
- **Animate on the native driver,** and start a slide only once its child has been laid out.
- **Decode images at their display size:** `resizeMethod="resize"`.
- **Re-render when a popup starts closing.** Emit a new array; mutating the old one hides the
  change.
- **Fast Refresh can raise "Encountered Unknown State"** after editing `authBloc.ts`. Press `r`
  in Metro; a cold start never shows it.
- **Metro on Windows:** the install scripts pass `--no-packager`, because the CLI fails to
  recognise a running Metro on Windows and starts a second one. Details in `README.md`.
- **An InkWell inside an InkWell never gets a tap** (`pointerEvents="box-only"`). Put the outer
  ink behind the content, as `PopupMenuItem` does.
- **Back with the side menu open does not close it** (quirk Q52, measured). Copy it.
- **Jest is not a phone:** window 750 wide at font scale 2, and fake timers fake
  `queueMicrotask`. Mock `useWindowDimensions`; use `doNotFake: ['queueMicrotask']`.
- **Pressable plays Android's tap click**, as Flutter's Material ink (`Feedback.forTap`) does. A
  Flutter GestureDetector or barrier makes no sound, so its RN Pressable needs
  `android_disableSound` (PARITY_ISSUES P26).
- **Flutter fakes bold for fonts with no bold face** (DroidSansMono, Source Sans Pro). Use
  `FakeBoldText`, not `fontWeight: 'bold'`.
- **An un-awaited `act()` breaks every later render in the test file**, silently: the next
  test's `render` produces an empty tree. Always `await act(async () => …)`, and advance fake
  timers inside it with `await jest.advanceTimersByTimeAsync(ms)`, never the sync
  `advanceTimersByTime` (it fires React's own "act was not awaited" check mid-act).
- **`jest.restoreAllMocks()` also removes spies made at module level** (the BackHandler listener
  collector the screen tests use): make such spies in `beforeEach` if `afterEach` restores.
- **PanResponder ignores `fireEvent.press`.** Drive `props.onResponderGrant / Move / Release`
  with a `touchHistory` whose timestamps increase and whose previous positions are set; it adds up
  current − previous per move (`__tests__/components/Switch.test.tsx`).

## 10. Keeping this file current

When a part finishes or the plan changes, update §5 (where things stand). Put new gotchas in §9
and in `../project/CLAUDE.md`. Keep the rest stable; the detail belongs in the docs listed in §4.
