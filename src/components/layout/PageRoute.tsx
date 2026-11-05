// Port of Navigator.push(MaterialPageRoute(...)) as the app uses it (the QR scanner page): a full
// page over the screens, with the platform's default page transition (Flutter 3.41.9,
// material/page_transitions_theme.dart; the app sets no pageTransitionsTheme).
//
// Android: PredictiveBackPageTransitionsBuilder, which without a back gesture is
// FadeForwardsPageTransitionsBuilder, 450 ms both ways (DualTransitionBuilder):
// - Opening, the new page fades in over the first 75 % (Interval(0, 0.75)) and slides from 25 % of
//   the width to 0 (Curves.easeInOutCubicEmphasized). The page under it fades out over the first
//   25 % and slides to −25 %. Behind both, ColorScheme.surface shows while they move.
// - Closing, the page fades out over the first 25 % of the way back and slides to 25 %, taking no
//   touches; the page under it fades back in over the first 75 % and slides from −25 % to 0.
// iOS: CupertinoPageTransitionsBuilder, 500 ms both ways: the new page slides in from the right
// edge (Curves.fastEaseInToSlowEaseOut, flipped on the way back) and the page under it slides to
// −1/3 of the width (Curves.linearToEaseOut, Curves.easeInToLinear on the way back).
// PORT-GAP: the iOS edge shadow on the incoming page (_CupertinoEdgeShadowDecoration) and the iOS
// swipe-back gesture.
//
// Android Back closes the top page, as Navigator.maybePop does for a pushed route. Popups and
// toasts opened while a page is up render above it (PageRouteHost sits under PopupHost, App.tsx).
// `pushPage` resolves once the page has been closed; `popPage()` is Navigator.pop(context) from
// inside the page.

import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ColorScheme } from '../../theme/colors';
import {
  Curves,
  transformCubic,
  transformInterval,
  transformThreePointCubic,
  ThreePointCubics,
} from '../../theme/curves';

const ANDROID_MS = 450;
const IOS_MS = 500;

type Entry = {
  id: number;
  builder: () => React.ReactNode;
  /** The route's animation: 0 closed, 1 open. Runs linearly; the curves are applied below. */
  progress: Animated.Value;
  closing: boolean;
  resolve: () => void;
};

let entries: Entry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => entries;

const duration = () => (Platform.OS === 'ios' ? IOS_MS : ANDROID_MS);

/** Pushes a page. Resolves when it has been closed, like `await Navigator.push(...)`. */
export function pushPage(builder: () => React.ReactNode): Promise<void> {
  return new Promise(resolve => {
    const entry: Entry = {
      id: nextId++,
      builder,
      progress: new Animated.Value(0),
      closing: false,
      resolve,
    };
    entries = [...entries, entry];
    emit();
    Animated.timing(entry.progress, {
      toValue: 1,
      duration: duration(),
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  });
}

/** Closes the top-most page (Navigator.pop from inside it). */
export function popPage(): void {
  const entry = [...entries].reverse().find(e => !e.closing);
  if (!entry) {
    return;
  }
  entry.closing = true;
  entries = [...entries];
  emit();
  Animated.timing(entry.progress, {
    toValue: 0,
    duration: duration(),
    easing: Easing.linear,
    useNativeDriver: true,
  }).start(() => {
    entries = entries.filter(e => e !== entry);
    emit();
    entry.resolve();
  });
}

/** Tests only: drops every page at once. */
export function resetPagesForTests(): void {
  entries = [];
  emit();
}

// The native driver interpolates linearly between points, so each curve is sampled.
const SAMPLES = Array.from({ length: 61 }, (_, i) => i / 60);
const sampled = (f: (t: number) => number) => ({
  inputRange: SAMPLES,
  outputRange: SAMPLES.map(f),
});

type Transition = {
  opacity: Animated.AnimatedInterpolation<number> | 1;
  x: Animated.AnimatedInterpolation<number>;
};

const emphasized = (t: number) =>
  transformThreePointCubic(ThreePointCubics.easeInOutCubicEmphasized, t);

/** The page's own transition, from its route animation `p` (opening, or closing). */
function primaryTransition(
  progress: Animated.Value,
  closing: boolean,
  width: number,
): Transition {
  if (Platform.OS === 'ios') {
    const curve = closing
      ? (t: number) =>
          1 -
          transformThreePointCubic(
            ThreePointCubics.fastEaseInToSlowEaseOut,
            1 - t,
          )
      : (t: number) =>
          transformThreePointCubic(ThreePointCubics.fastEaseInToSlowEaseOut, t);
    return {
      opacity: 1,
      x: progress.interpolate(sampled(p => width * (1 - curve(p)))),
    };
  }
  if (!closing) {
    return {
      opacity: progress.interpolate(
        sampled(p => transformInterval(0, 0.75, p)),
      ),
      x: progress.interpolate(sampled(p => width * 0.25 * (1 - emphasized(p)))),
    };
  }
  // Closing: the reverse builder on ReverseAnimation(p).
  return {
    opacity: progress.interpolate(
      sampled(p => 1 - transformInterval(0, 0.25, 1 - p)),
    ),
    x: progress.interpolate(sampled(p => width * 0.25 * emphasized(1 - p))),
  };
}

/** The transition of the page under the top one, from the top route's animation `s`. */
function secondaryTransition(
  progress: Animated.Value,
  closing: boolean,
  width: number,
): Transition {
  if (Platform.OS === 'ios') {
    const curve = closing
      ? (t: number) => transformCubic(Curves.easeInToLinear, t)
      : (t: number) => transformCubic(Curves.linearToEaseOut, t);
    return {
      opacity: 1,
      x: progress.interpolate(sampled(s => (-width / 3) * curve(s))),
    };
  }
  if (!closing) {
    // The reverse builder on ReverseAnimation(ReverseAnimation(s)) = s.
    return {
      opacity: progress.interpolate(
        sampled(s => 1 - transformInterval(0, 0.25, s)),
      ),
      x: progress.interpolate(sampled(s => -width * 0.25 * emphasized(s))),
    };
  }
  // The forward builder on ReverseAnimation(s) = 1 − s.
  return {
    opacity: progress.interpolate(
      sampled(s => transformInterval(0, 0.75, 1 - s)),
    ),
    x: progress.interpolate(
      sampled(s => -width * 0.25 + width * 0.25 * emphasized(1 - s)),
    ),
  };
}

/** Moves `children` as the page under `above` (the page pushed over it), if there is one. */
function Underlying({
  above,
  children,
}: {
  above: Entry | undefined;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  // An entry is the same object once it starts closing, so its flag is a dependency of its own.
  const aboveProgress = above?.progress;
  const aboveClosing = above?.closing ?? false;
  const transition = useMemo(
    () =>
      aboveProgress === undefined
        ? null
        : secondaryTransition(aboveProgress, aboveClosing, width),
    [aboveProgress, aboveClosing, width],
  );
  // The same views whether or not a page is above, so the screens are never mounted afresh.
  return (
    <View
      style={[
        styles.fill,
        transition !== null && Platform.OS === 'android'
          ? styles.surface
          : null,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          transition === null
            ? null
            : {
                opacity: transition.opacity,
                transform: [{ translateX: transition.x }],
              },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

/** Wraps the screens, so they move as the page under the first pushed page. */
export function PageRouteBase({ children }: { children: React.ReactNode }) {
  const current = useSyncExternalStore(subscribe, snapshot);
  return <Underlying above={current[0]}>{children}</Underlying>;
}

function Page({ entry, above }: { entry: Entry; above: Entry | undefined }) {
  const { width } = useWindowDimensions();
  const { progress, closing } = entry;
  const transition = useMemo(
    () => primaryTransition(progress, closing, width),
    [progress, closing, width],
  );
  return (
    <Animated.View
      pointerEvents={closing ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: transition.opacity,
          transform: [{ translateX: transition.x }],
        },
      ]}
    >
      <Underlying above={above}>{entry.builder()}</Underlying>
    </Animated.View>
  );
}

/** Renders the pushed pages. Mount once, above the screens and under PopupHost's popups. */
export function PageRouteHost() {
  const current = useSyncExternalStore(subscribe, snapshot);
  const open = current.length > 0;
  useEffect(() => {
    if (!open) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        popPage();
        return true;
      },
    );
    return () => subscription.remove();
  }, [open]);
  return (
    <>
      {current.map((entry, i) => (
        <Page key={entry.id} entry={entry} above={current[i + 1]} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  surface: { backgroundColor: ColorScheme.surface },
});
