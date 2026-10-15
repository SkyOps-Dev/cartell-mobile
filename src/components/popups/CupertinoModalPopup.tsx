// Port of showCupertinoModalPopup and CupertinoPopupSurface (Flutter 3.41.9 cupertino/route.dart
// CupertinoModalPopupRoute, cupertino/dialog.dart), as the Debug Info panel uses them.
//
// The route:
// - The child sits at the bottom centre with loose constraints (Align.bottomCenter) and slides up
//   by its own height (FractionalTranslation from Offset(0, 1)), starting once it has been laid
//   out, as in Flutter.
// - The motion is a critically damped spring (stiffness 522.35, damping 45.71, mass 1) that always
//   starts at velocity 0, also when it reverses mid-way. With v0 = 0 its path is a fixed curve,
//   x(t) = end + (start − end)(1 + ωt)e^(−ωt), ω = √522.35, and it stops (snapping to the end) once
//   it is within 1e-3 of the end and slower than 0.03/s: 405 ms for a full slide (Flutter's
//   comment: "approximately" iOS's 0.404 s).
// - Barrier kCupertinoModalBarrierColor resolved for the dark theme (0x7A000000), faded in with
//   Curves.ease on the route's animation. Tapping it closes the popup (barrierDismissible); it is
//   left out of screen readers (semanticsDismissible: false). Android Back closes the top popup.
// - While closing, nothing in the route takes touches.
//
// Popups (showPopupMessage) opened from inside render above this route, as dialogs pushed after it
// do in Flutter: the host is mounted under PopupHost (App.tsx). `popModalPopup()` is
// Navigator.pop(context) from inside the popup.

import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const OMEGA = Math.sqrt(522.35);
const DISTANCE_TOLERANCE = 1e-3;
const VELOCITY_TOLERANCE = 0.03;

// The spring's remaining distance and speed after t seconds, per unit of distance.
const remaining = (t: number) => (1 + OMEGA * t) * Math.exp(-OMEGA * t);
const speed = (t: number) => OMEGA * OMEGA * t * Math.exp(-OMEGA * t);

/** How long the spring takes to settle over `distance` (0..1), in ms (Flutter's isDone). */
export function springSettleMs(distance: number): number {
  for (let ms = 1; ms < 2000; ms++) {
    const t = ms / 1000;
    if (
      distance * remaining(t) < DISTANCE_TOLERANCE &&
      distance * speed(t) < VELOCITY_TOLERANCE
    ) {
      return ms;
    }
  }
  return 2000;
}

/** The spring as an easing over `durationMs`: the share of the distance covered at u. */
function springEasing(durationMs: number) {
  const seconds = durationMs / 1000;
  return (u: number) => 1 - remaining(u * seconds);
}

// kCupertinoModalBarrierColor's dark colour, 0x7A000000.
const BARRIER_ALPHA = 0x7a / 255;
// Curves.ease (Cubic(0.25, 0.1, 0.25, 1.0)) sampled for the native driver, which interpolates
// linearly between points.
const EASE_SAMPLES = Array.from({ length: 41 }, (_, i) => i / 40);
const barrierOpacityRange = {
  inputRange: EASE_SAMPLES,
  outputRange: EASE_SAMPLES.map(x => Easing.ease(x) * BARRIER_ALPHA),
};

/** The slide under way: the spring from `from` to `to`, started at `startedAt` (Date.now()). */
type Motion = { from: number; to: number; startedAt: number; duration: number };

type Entry = {
  id: number;
  builder: () => React.ReactNode;
  progress: Animated.Value;
  height: Animated.Value;
  motion: Motion;
  /** The slide up starts once the child has been measured. */
  measured: boolean;
  closing: boolean;
  resolve: () => void;
};

// --- store -------------------------------------------------------------------------------

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

/**
 * Where the slide is now. The curve is known, so this is computed rather than read back from the
 * native driver, which would cost a round-trip and leave the reverse a frame late.
 */
function positionNow({ from, to, startedAt, duration }: Motion): number {
  const u = Math.min(1, (Date.now() - startedAt) / duration);
  return u >= 1 ? to : from + (to - from) * springEasing(duration)(u);
}

function animate(entry: Entry, to: number, onEnd?: () => void) {
  const from = positionNow(entry.motion);
  const duration = springSettleMs(Math.abs(to - from));
  entry.motion = { from, to, startedAt: Date.now(), duration };
  // Stops the running slide and restarts the spring from where it is, at velocity 0.
  entry.progress.setValue(from);
  Animated.timing(entry.progress, {
    toValue: to,
    duration,
    easing: springEasing(duration),
    useNativeDriver: true,
  }).start(onEnd);
}

/** Opens a popup that slides up from the bottom. Resolves once it has been closed. */
export function showCupertinoModalPopup(
  builder: () => React.ReactNode,
): Promise<void> {
  return new Promise(resolve => {
    const entry: Entry = {
      id: nextId++,
      builder,
      progress: new Animated.Value(0),
      // Until the child is measured, a height that keeps it below any screen.
      height: new Animated.Value(10000),
      motion: { from: 0, to: 0, startedAt: 0, duration: 1 },
      measured: false,
      closing: false,
      resolve,
    };
    entries = [...entries, entry];
    emit();
  });
}

/**
 * The child has been laid out. Flutter lays the child out before the slide's first frame; here
 * its height arrives with the first layout event, so the slide starts then. Started earlier, it
 * would spend its fastest frames below the screen, waiting for the height, and the panel would
 * appear already part-way up.
 */
function onChildLayout(entry: Entry, height: number) {
  entry.height.setValue(height);
  if (entry.measured) {
    return;
  }
  entry.measured = true;
  if (!entry.closing) {
    animate(entry, 1);
  }
}

/** Closes the top-most modal popup (Navigator.pop from inside it). */
export function popModalPopup(): void {
  const entry = [...entries].reverse().find(e => !e.closing);
  if (!entry) {
    return;
  }
  entry.closing = true;
  const remove = () => {
    entries = entries.filter(e => e.id !== entry.id);
    emit();
    entry.resolve();
  };
  if (!entry.measured) {
    // Not yet slid in: still below the screen with the barrier clear, as a spring reversed from 0.
    remove();
    return;
  }
  entries = [...entries];
  emit();
  animate(entry, 0, remove);
}

// --- host --------------------------------------------------------------------------------

/** Renders open modal popups. Mount once, above the screens and under PopupHost's popups. */
export function CupertinoModalPopupHost() {
  const open = useSyncExternalStore(subscribe, snapshot);

  const hasOpen = open.some(e => !e.closing);
  useEffect(() => {
    if (!hasOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        popModalPopup();
        return true;
      },
    );
    return () => subscription.remove();
  }, [hasOpen]);

  return (
    <>
      {open.map(entry => (
        <ModalPopupRoute key={entry.id} entry={entry} />
      ))}
    </>
  );
}

function ModalPopupRoute({ entry }: { entry: Entry }) {
  const { barrierOpacity, translateY } = useMemo(
    () => ({
      barrierOpacity: entry.progress.interpolate(barrierOpacityRange),
      translateY: Animated.multiply(
        Animated.subtract(1, entry.progress),
        entry.height,
      ),
    }),
    [entry],
  );
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={entry.closing ? 'none' : 'box-none'}
      testID="modal-popup-route"
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.barrier,
          { opacity: barrierOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          importantForAccessibility="no"
          accessibilityElementsHidden
          onPress={popModalPopup}
          // Flutter's ModalBarrier plays no click.
          android_disableSound
          testID="modal-popup-barrier"
        />
      </Animated.View>
      <View style={styles.align} pointerEvents="box-none">
        <Animated.View
          style={[styles.translation, { transform: [{ translateY }] }]}
          pointerEvents="box-none"
          onLayout={event =>
            onChildLayout(entry, event.nativeEvent.layout.height)
          }
          testID="modal-popup-child"
        >
          {entry.builder()}
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * CupertinoPopupSurface: clips its child to a rounded rectangle of radius 13 (a superellipse in
 * Flutter; iOS draws the same continuous curve, Android a circular corner) over the surface colour,
 * 0xCC2D2D2D in the dark theme. Flutter also blurs (σ 30) what lies behind the surface; only a
 * see-through child shows it, and the app's only child is opaque, so it is left out.
 */
export function CupertinoPopupSurface({
  children,
}: {
  children: React.ReactNode;
}) {
  return <View style={styles.surface}>{children}</View>;
}

const styles = StyleSheet.create({
  barrier: { backgroundColor: '#000000' },
  align: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  // Loose constraints: the child chooses its own size, up to the screen.
  translation: {
    alignSelf: 'stretch',
    alignItems: 'center',
    maxHeight: '100%',
  },
  surface: {
    borderRadius: 13,
    ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' as const } : null),
    overflow: 'hidden',
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
  },
});
