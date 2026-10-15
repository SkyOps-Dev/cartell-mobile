// Port of material/drawer.dart (Flutter 3.41.9): the Drawer panel and the DrawerController that
// slides it in over a Scaffold, as Scaffold(drawer:) uses them (spec 10 §1).
//
// Drawer (_DrawerDefaultsM3): 304 wide, full height, the given colour, end corners rounded 16 and
// clipped, elevation 1 with a transparent shadow (no shadow). Measured on the Flutter app
// (RMX5070, 2026-10-15): 912 px wide, #54585A, over the status bar.
//
// DrawerController:
// - Motion is AnimationController.fling, not a timed curve: a critically damped spring (mass 1,
//   stiffness 500) aimed 0.01 past the end, with the value clamped to 0..1 and the animation done
//   the moment it reaches the end. open() flings at +1/s, close() at −1/s; from rest either takes
//   about 300 ms. `flingCurve` below solves that spring exactly and plays it as a timed curve on
//   the UI thread.
// - Scrim: black54 scaled by the value (alpha 0.54 × value). A tap on it closes.
// - The panel's visible width is value × its width (Align widthFactor): it slides in from the left.
//   Its width is the child's own (304 for a Drawer), as is the width a drag is measured against.
// - Closed: a strip 20 + the left inset wide along the left edge starts a horizontal drag that
//   pulls the drawer open; taps go through to whatever is under it.
// - Open (or moving): a horizontal drag anywhere moves it; letting go flings it when faster than
//   365 dp/s, otherwise it settles open or closed at the halfway mark. A touch stops it mid-motion
//   (onHorizontalDragDown); if no drag follows, it then settles the same way.
// - Built only while not dismissed: the panel is created when it starts to open and removed once it
//   is closed, as Flutter builds the drawer only then. The fling starts on the panel's first
//   layout, so the slide never runs ahead of a panel that is not there yet.
// - Android Back does not close it in this app: every screen with a drawer sits under a PopScope
//   with canPop false, which makes ModalRoute.popDisposition doNotPop before the drawer's
//   LocalHistoryEntry is consulted. Back runs the screen's own handler with the drawer left open
//   (measured on the Flutter app, 2026-10-15: "Leave App" over the open drawer).
//
// The drag is handled with a PanResponder on the Scaffold's root, in the capture phase, so the
// buttons under the edge strip keep their taps until a horizontal drag is recognised. Touch slop is
// what Flutter's drag recognisers use: Android's scaled touch slop (8 dp) through
// DeviceGestureSettings, kTouchSlop (18) on iOS.
// LATER(part 36): with "Remove animations" (MediaQuery disableAnimations), fling scales its velocity
// by 200, so the drawer snaps open and shut.

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

export const kDrawerWidth = 304; // _kWidth
const EDGE_DRAG_WIDTH = 20; // _kEdgeDragWidth
const MIN_FLING_VELOCITY = 365; // _kMinFlingVelocity, dp/s
const SCRIM_ALPHA = 0.54; // Colors.black54
const TOUCH_SLOP = Platform.OS === 'android' ? 8 : 18;

// --- the fling ---------------------------------------------------------------------------------

const SPRING_OMEGA = Math.sqrt(500); // sqrt(stiffness / mass); damping ratio 1
const FLING_TOLERANCE = 0.01; // _kFlingTolerance.distance

/**
 * AnimationController.fling from `from` at `velocity` (values per second) as a duration plus an
 * easing for withTiming: the critically damped spring x(t) = target + (c1 + c2·t)·e^(−ωt), run
 * until it is within 0.01 of its target, which is exactly where the clamped value reaches 0 or 1.
 */
export function flingCurve(
  from: number,
  velocity: number,
): { to: number; durationMs: number; easing: (t: number) => number } {
  const to = velocity < 0 ? 0 : 1;
  const target = velocity < 0 ? -FLING_TOLERANCE : 1 + FLING_TOLERANCE;
  const c1 = from - target;
  const c2 = velocity + SPRING_OMEGA * c1;
  const x = (t: number) => target + (c1 + c2 * t) * Math.exp(-SPRING_OMEGA * t);
  let seconds = 0;
  while (seconds < 5 && Math.abs(x(seconds) - target) >= FLING_TOLERANCE) {
    seconds += 0.001;
  }
  const span = to - from;
  if (Math.abs(span) < 1e-6 || seconds === 0) {
    // Already there (open() on an open drawer, which every tap on it does): nothing to play.
    // withTiming runs its easing on the UI thread, so even this one must be a worklet.
    return {
      to,
      durationMs: 0,
      easing: () => {
        'worklet';
        return 1;
      },
    };
  }
  const omega = SPRING_OMEGA;
  return {
    to,
    durationMs: seconds * 1000,
    easing: (t: number) => {
      'worklet';
      const time = t * seconds;
      const value = target + (c1 + c2 * time) * Math.exp(-omega * time);
      return (Math.min(Math.max(value, 0), 1) - from) / span;
    },
  };
}

// --- the panel ---------------------------------------------------------------------------------

/** Material's Drawer: the panel itself. */
export function Drawer({
  backgroundColor,
  children,
}: {
  backgroundColor: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[styles.drawer, { backgroundColor }]}
      accessibilityLabel="Navigation menu"
    >
      {children}
    </View>
  );
}

// --- the controller ----------------------------------------------------------------------------

export type DrawerControllerHandle = { open(): void; close(): void };

type Props = {
  /** The panel (a Drawer). */
  drawer: React.ReactNode;
  /** drawerCallback: told whether the drawer counts as opened. */
  onOpenedChanged: (isOpened: boolean) => void;
  /** Everything the drawer slides over. */
  children: React.ReactNode;
};

export const DrawerController = forwardRef<DrawerControllerHandle, Props>(
  function DrawerControllerState({ drawer, onOpenedChanged, children }, ref) {
    const insets = useSafeAreaInsets();
    const value = useSharedValue(0);
    // _width: the panel's laid-out width (304 for a Drawer), or 304 before it has one.
    const width = useRef(kDrawerWidth);
    const panelWidth = useSharedValue(kDrawerWidth);
    // _controller.isDismissed: while true only the edge strip exists.
    const [dismissed, setDismissed] = useState(true);
    const dismissedRef = useRef(true);
    const animating = useRef(false);
    const laidOut = useRef(false);
    const pendingFling = useRef<number | null>(null);
    const previouslyOpened = useRef(false);
    const onOpenedChangedRef = useRef(onOpenedChanged);
    onOpenedChangedRef.current = onOpenedChanged;

    const setDismissedState = useCallback((next: boolean) => {
      if (dismissedRef.current === next) {
        return;
      }
      dismissedRef.current = next;
      if (next) {
        laidOut.current = false;
      }
      setDismissed(next);
    }, []);

    const onFlingEnd = useCallback(
      (finished: boolean, to: number) => {
        if (!finished) {
          return;
        }
        animating.current = false;
        if (to === 0) {
          setDismissedState(true);
        }
      },
      [setDismissedState],
    );

    const startFling = useCallback(
      (velocity: number) => {
        const { to, durationMs, easing } = flingCurve(value.value, velocity);
        animating.current = true;
        value.value = withTiming(to, { duration: durationMs, easing }, done => {
          scheduleOnRN(onFlingEnd, done === true, to);
        });
      },
      [value, onFlingEnd],
    );

    const fling = useCallback(
      (velocity: number) => {
        cancelAnimation(value);
        if (velocity > 0 || value.value > 0) {
          setDismissedState(false);
        }
        if (laidOut.current || velocity < 0) {
          startFling(velocity);
        } else {
          // Opening from closed: the panel is being created; start once it has its size.
          pendingFling.current = velocity;
        }
      },
      [value, setDismissedState, startFling],
    );

    const open = useCallback(() => {
      fling(1);
      onOpenedChangedRef.current(true);
    }, [fling]);

    const close = useCallback(() => {
      fling(-1);
      onOpenedChangedRef.current(false);
    }, [fling]);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    const onPanelLayout = (event: LayoutChangeEvent) => {
      width.current = event.nativeEvent.layout.width;
      panelWidth.value = width.current;
      laidOut.current = true;
      const velocity = pendingFling.current;
      if (velocity !== null) {
        pendingFling.current = null;
        startFling(velocity);
      }
    };

    // _move: the value follows the finger, clamped to 0..1.
    const move = useCallback(
      (delta: number) => {
        const next = Math.min(
          Math.max(value.value + delta / width.current, 0),
          1,
        );
        value.value = next;
        setDismissedState(next === 0);
        const opened = next > 0.5;
        if (opened !== previouslyOpened.current) {
          onOpenedChangedRef.current(opened);
        }
        previouslyOpened.current = opened;
      },
      [value, setDismissedState],
    );

    // _settle
    const settle = useCallback(
      (xVelocity: number) => {
        if (dismissedRef.current) {
          return;
        }
        if (Math.abs(xVelocity) >= MIN_FLING_VELOCITY) {
          const visualVelocity = xVelocity / width.current;
          fling(visualVelocity);
          onOpenedChangedRef.current(visualVelocity > 0);
        } else if (value.value < 0.5) {
          close();
        } else {
          open();
        }
      },
      [value, fling, open, close],
    );

    const dragging = useRef(false);
    const lastDx = useRef(0);

    const panResponder = useMemo(() => {
      const edgeWidth = EDGE_DRAG_WIDTH + insets.left;
      return PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) => {
          if (dismissedRef.current && gesture.x0 > edgeWidth) {
            return false;
          }
          return (
            Math.abs(gesture.dx) > TOUCH_SLOP &&
            Math.abs(gesture.dx) > Math.abs(gesture.dy)
          );
        },
        onPanResponderGrant: (_event, gesture) => {
          // DragStartBehavior.start: the drag starts where it was recognised.
          dragging.current = true;
          lastDx.current = gesture.dx;
          cancelAnimation(value);
          animating.current = false;
        },
        onPanResponderMove: (_event, gesture) => {
          move(gesture.dx - lastDx.current);
          lastDx.current = gesture.dx;
        },
        onPanResponderRelease: (_event, gesture) => {
          dragging.current = false;
          settle(gesture.vx * 1000);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          settle(0);
        },
        onPanResponderTerminationRequest: () => false,
      });
    }, [insets.left, value, move, settle]);

    // onHorizontalDragDown / onHorizontalDragCancel while the drawer is showing.
    const onTouchStart = () => {
      if (dismissedRef.current) {
        return;
      }
      if (animating.current) {
        cancelAnimation(value);
        animating.current = false;
      }
    };
    const onTouchEnd = () => {
      if (dismissedRef.current || dragging.current) {
        return;
      }
      // After any tap the touch delivered (a row's onPress closes the drawer first, as the tap
      // wins Flutter's gesture arena before the drag recogniser is cancelled).
      setTimeout(() => {
        if (
          dismissedRef.current ||
          animating.current ||
          dragging.current ||
          pendingFling.current !== null
        ) {
          return;
        }
        if (value.value < 0.5) {
          close();
        } else {
          open();
        }
      }, 0);
    };

    const scrimStyle = useAnimatedStyle(() => ({
      opacity: SCRIM_ALPHA * value.value,
    }));
    const panelStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: (value.value - 1) * panelWidth.value }],
    }));

    return (
      <View
        style={styles.root}
        {...panResponder.panHandlers}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {children}
        {!dismissed && (
          // LATER(part 36): BlockSemantics: on Android, hide the screen behind the open drawer
          // from screen readers too (iOS has accessibilityViewIsModal).
          <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
              accessibilityLabel="Dismiss"
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => close()}
            />
            <Animated.View
              style={[styles.panel, panelStyle]}
              onLayout={onPanelLayout}
            >
              {drawer}
            </Animated.View>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: '#000000' },
  // As wide as its child, like Align(widthFactor) around the drawer: a Drawer is 304.
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  // ConstrainedBox(BoxConstraints.expand(width: 304)): full height, in the drawer slot or the rail.
  drawer: {
    width: kDrawerWidth,
    height: '100%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
});
