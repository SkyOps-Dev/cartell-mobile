# Performance

The rule (PORTING_PLAN §1): **the RN app behaves exactly like the Flutter app, and its code is as
efficient as we can make it.** An optimisation is welcome when nobody can see a difference
against Flutter on the phone. Anything that changes what the user sees or does is not an
optimisation; it goes to the quirk register instead.

**Optimisations live inside well-structured code, never instead of it.** They go into the shared
components and theme (one fix in `InkWell` helps every button), not into one-off copies or
clever tricks scattered through screens. If an optimisation makes code harder to follow, it needs
a measurement that justifies it and a comment that explains it.

## Why RN has to work harder than Flutter

Flutter paints its whole UI itself on one canvas, with its own engine. React Native turns each
`<View>`, `<Text>` and `<TextInput>` into a real Android view, created on Android's main thread.
So every screen that appears costs RN view creation that Flutter never pays. In a debug build that
work runs slowest, because Android does not fully optimise a debuggable app's own code. Flutter's
engine is precompiled, so its debug builds lose much less.

Measured on the RMX5070 (120 Hz), debug build, Welcome ↔ Log In switches (2026-10-13): about 75
native views for Welcome, 17–25% late frames, one ~150 ms main-thread frame as each switch starts.

## Practices

1. **Create as few native views as possible.** Every wrapper `View` is a real Android view. Mount
   decoration (press highlights, ripples, overlays) only while it is showing. Use React
   fragments and style props instead of extra wrappers. Count views with
   `adb shell dumpsys activity top` (View Hierarchy section).
2. **Decode images at the size they are shown.** Use `resizeMethod="resize"` for any image larger
   than its box (the 2081 × 977 logo shows at ~840 px wide). Flutter decodes once and caches.
3. **Fade whole screens as one layer.** `needsOffscreenAlphaCompositing` +
   `renderToHardwareTextureAndroid` while a screen fades, as Flutter's FadeTransition does
   (`src/components/CrossFadeSwitcher.tsx`). Otherwise each view fades on its own and labels wash
   out.
4. **Animate on the UI thread.** `useNativeDriver: true` for Animated; Reanimated worklets for
   anything per frame (keyboard insets, scroll reveal). Nothing per frame through React state.
5. **Keep work out of the first frame of a transition.** Unmount the outgoing screen after the
   fade, not at its start. Start heavy work (requests, storage reads) from effects, not render.
6. **Avoid needless re-renders.** Stable callbacks and props for list rows and buttons;
   `useSyncExternalStore` for global stores; memoise only where a measurement shows it helps.

## How to measure

- **Frame timing:** `adb shell dumpsys gfxinfo com.iwatllc.cartell.rn reset`, perform the
  interaction, then `adb shell dumpsys gfxinfo com.iwatllc.cartell.rn`. Look at *Janky frames*,
  the 90th/99th percentiles and *Slow UI thread*. At 120 Hz a frame has 8.3 ms.
- **What the user sees:** `screencap` at fixed delays after an input, in both apps, and compare
  pixel values (how the back-button press and the screen switch were matched).
- **Judge final performance in release builds.** Debug numbers are for comparing changes against
  each other. A release comparison needs a release build of both apps (`fvm flutter run --release`;
  an RN release build), and each replaces that app's debug install on the phone for the test.

Applied so far: the arc spinners (`AnimatedArc`) and the keyboard insets run on the UI thread;
the logo decodes at display size; screens fade as one layer.

7. **Never let react-native-svg paint something large.** On Android it paints at the view's own
   size on the UI thread. Draw smooth shapes (gradients, soft circles) small and scale the view
   up with a transform. The ink wave was the case that taught this (below).

## Measured fixes

- **Ink wave (2026-10-14, `src/components/ink/InkSparkleWave.tsx`).** A full-width button's
  wave was drawn as one ~1200 dp SVG, 3600 × 3600 px at 3×: its first frame took **150 ms** on the
  UI thread (`dumpsys gfxinfo`: slow UI thread + slow issue draw commands). Every press on a
  wide button froze the screen for that frame; it showed as the Debug Info panel skipping the
  start of its close slide, and is the likely source of the "~150 ms frame as each switch
  starts" above (re-measure). Now drawn at 96 dp and scaled: worst frame 34–44 ms, and the
  panel's slide follows Flutter's spring frame by frame.
- **Tap to motion, debug build.** RN's Debug Info close starts about 65 ms after Flutter's for the
  same tap (the touch reaches JavaScript and the animation goes back to native). Speed and curve
  match. To re-measure in a release build.

## Open

- Measure a release build of both apps (not done yet).
- Trim always-mounted views in `InkWell` (clip + highlight on every button), `Icon`,
  `OutlinedTextField` and `MaterialPill`.
