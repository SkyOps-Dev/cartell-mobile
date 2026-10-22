// Port of Material 3's Switch (material/switch.dart: _MaterialSwitchState, _SwitchPainter,
// _SwitchDefaultsM3, _SwitchConfigM3; widgets/toggleable.dart; Flutter 3.41.9) as the app uses it:
// `Switch(activeThumbColor: <colour>, value, onChanged)` and nothing else, on the dark Material 3
// scheme (spec 07 §3.1). The painter's per-frame geometry is evaluated on the UI thread.
//
// Box 60 × 48 (52 × 40 + padding h4, tap target padded). Track 52 × 32 pill at (4, 8):
// - off: surfaceContainerHighest #36343B with a 2 px outline #938F99;
// - on: the active thumb colour at alpha 0x80, outline fading to transparent.
// Thumb (a stadium, centre y 24, centre x 20 → 40):
// - off 16, on 24, pressed 28; off #938F99, on the active thumb colour, pressed off #CAC4D0.
// - It slides on Curves.easeOutBack (overshooting), flipped when going off; colours follow
//   Curves.easeOut (easeIn going off). The controller runs 300 ms, linear, for the distance left.
// - Its size follows Flutter's TweenSequence: going on, 11 % off → 34 × 22, 72 % → on, 17 % hold;
//   going off, the mirror image.
// Press ripple: a circle of radius up to 20 at the thumb, 100 ms fastOutSlowIn, onSurface at 0.1
// when off and the active thumb colour at alpha 0x1F when on.
// Gestures, as Flutter's arena decides them:
// - A tap reports "down" at once if the finger lifts within 100 ms (kPressTimeout), else after
//   100 ms. Down grows the ripple and the thumb; up shrinks them; the tap flips the value.
// - A horizontal move past 18 (kTouchSlop) is a drag instead: the thumb follows the finger, linearly,
//   and on release the value flips if the thumb ended on the other half.
// Not reproduced: Flutter recomputes the pressed thumb size only on every other frame while the
// press shrinks (_stopPressAnimation toggles each paint); here it follows every frame. Hover and
// focus states (no mouse or keyboard on a phone).

import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ColorScheme } from '../../theme/colors';
import {
  clampUnit,
  CubicCurve,
  Curves,
  transformCubic,
  transformFlipped,
} from '../../theme/curves';

const WIDTH = 60;
const HEIGHT = 48;
const TRACK_LEFT = 4;
const TRACK_TOP = 8;
const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const TRACK_RADIUS = TRACK_HEIGHT / 2;
const TRACK_INNER_LENGTH = TRACK_WIDTH - TRACK_HEIGHT;
const INACTIVE_RADIUS = 8;
const ACTIVE_RADIUS = 12;
const PRESSED_RADIUS = 14;
const TRANSITIONAL_WIDTH = 34;
const TRANSITIONAL_HEIGHT = 22;
const TOGGLE_MS = 300;
const REACTION_MS = 100; // kRadialReactionDuration
const SPLASH_RADIUS = 20;
const PRESS_TIMEOUT_MS = 100; // kPressTimeout
const TOUCH_SLOP = 18; // kTouchSlop

// Thumb-size curves (switch.dart thumbSizeAnimation).
const GROW: CubicCurve = [0.31, 0.0, 0.56, 1.0];
const SETTLE: CubicCurve = [0.2, 0.0, 0.0, 1.0];

// AnimationStatus, and the controller's direction.
const DISMISSED = 0;
const FORWARD = 1;
const REVERSE = 2;
const COMPLETED = 3;

// The position CurvedAnimation's curve: the mixin's initial easeIn / easeOut, Material 3's
// easeOutBack (set when the value changes at rest), or linear while dragging.
const CURVE_INITIAL = 0;
const CURVE_BACK = 1;
const CURVE_LINEAR = 2;

type Rgba = readonly [number, number, number, number];

/** #RRGGBB (with an optional 0–255 alpha) as Flutter's 0–1 channels. */
function rgba(hex: string, alpha = 255): Rgba {
  const value = parseInt(hex.slice(1, 7), 16);
  /* eslint-disable no-bitwise */
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha / 255,
  ];
  /* eslint-enable no-bitwise */
}

/** Color.lerp: each channel, alpha included, straight (not premultiplied), clamped. */
function lerpColor(a: Rgba, b: Rgba, t: number): string {
  'worklet';
  const channel = (i: number) =>
    Math.min(1, Math.max(0, a[i] + (b[i] - a[i]) * t));
  const byte = (i: number) => Math.round(channel(i) * 255);
  return `rgba(${byte(0)}, ${byte(1)}, ${byte(2)}, ${channel(3)})`;
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/** A CurvedAnimation over a controller: picks its curve by the direction locked at the start. */
function curved(
  t: number,
  direction: number,
  status: number,
  forward: (t: number) => number,
  reverse: ((t: number) => number) | null,
): number {
  'worklet';
  if (t === 0 || t === 1) {
    return t;
  }
  const useForward =
    reverse === null || (direction !== 0 ? direction : status) !== REVERSE;
  return useForward ? forward(t) : reverse!(t);
}

/** TweenSequence of [weight, size at the item's start, size at its end, curve or null]. */
function sizeSequence(
  t: number,
  items: readonly (readonly [
    number,
    number,
    number,
    ((t: number) => number) | null,
  ])[],
): number {
  'worklet';
  let start = 0;
  for (let i = 0; i < items.length; i++) {
    const [weight, from, to, curve] = items[i];
    const end = start + weight / 100;
    if (i === items.length - 1 || (t >= start && t < end)) {
      const local = (t - start) / (end - start);
      return lerp(from, to, curve === null ? local : curve(local));
    }
    start = end;
  }
  return 0;
}

/** An AnimationController's value, status, direction and its CurvedAnimations' locked direction. */
type Controller = {
  value: SharedValue<number>;
  status: SharedValue<number>;
  direction: SharedValue<number>;
  curveDirection: SharedValue<number>;
};

function useController(initial: number): Controller {
  return {
    value: useSharedValue(initial),
    status: useSharedValue(initial === 1 ? COMPLETED : DISMISSED),
    direction: useSharedValue(FORWARD),
    curveDirection: useSharedValue(0),
  };
}

/** Sets the status; CurvedAnimation._updateCurveDirection follows every status change. */
function setStatus(controller: Controller, status: number) {
  'worklet';
  controller.status.value = status;
  controller.curveDirection.value =
    status === DISMISSED || status === COMPLETED
      ? 0
      : controller.curveDirection.value !== 0
      ? controller.curveDirection.value
      : status;
}

/** forward() / reverse(): run to the end for the distance left of `durationMs`. */
function animateTo(controller: Controller, target: 0 | 1, durationMs: number) {
  const direction = target === 1 ? FORWARD : REVERSE;
  controller.direction.value = direction;
  const distance = Math.abs(target - controller.value.value);
  if (distance === 0) {
    // Already there: stop any animation still running (Flutter's controller stops). Without this
    // a quick tap's reverse() found the press animation not yet started and left it running, so
    // the thumb stayed pressed.
    controller.value.value = target;
    setStatus(controller, target === 1 ? COMPLETED : DISMISSED);
    return;
  }
  setStatus(controller, direction);
  controller.value.value = withTiming(
    target,
    { duration: durationMs * distance, easing: Easing.linear },
    finished => {
      if (finished) {
        setStatus(controller, target === 1 ? COMPLETED : DISMISSED);
      }
    },
  );
}

/** Setting the controller's value directly (a drag): stops it; the status follows the value. */
function jumpTo(controller: Controller, value: number) {
  controller.value.value = value;
  setStatus(
    controller,
    value === 0
      ? DISMISSED
      : value === 1
      ? COMPLETED
      : controller.direction.value,
  );
}

type Props = {
  value: boolean;
  onChanged: (value: boolean) => void;
  activeThumbColor: string;
};

export function Switch({ value, onChanged, activeThumbColor }: Props) {
  const position = useController(value ? 1 : 0);
  const reaction = useController(0);
  const curveMode = useSharedValue(CURVE_INITIAL);
  // _pressedInactiveThumbRadius / _pressedActiveThumbRadius: −1 until first set.
  const pressedInactiveRadius = useSharedValue(-1);
  const pressedActiveRadius = useSharedValue(-1);

  const colors = useMemo(
    () => ({
      activeThumb: rgba(activeThumbColor),
      inactiveThumb: rgba(ColorScheme.outline),
      inactivePressedThumb: rgba(ColorScheme.onSurfaceVariant),
      // No activeTrackColor: the active thumb colour at alpha 0x80.
      activeTrack: rgba(activeThumbColor, 0x80),
      inactiveTrack: rgba(ColorScheme.surfaceContainerHighest),
      activeOutline: rgba('#000000', 0),
      inactiveOutline: rgba(ColorScheme.outline),
      // The active thumb colour at kRadialReactionAlpha; onSurface at 0.1 when off.
      activeReaction: rgba(activeThumbColor, 0x1f),
      inactiveReaction: rgba(ColorScheme.onSurface, 0.1 * 255),
    }),
    [activeThumbColor],
  );

  // didUpdateWidget: a new value animates there, with easeOutBack again if at rest.
  const firstValue = useRef(true);
  useEffect(() => {
    if (firstValue.current) {
      firstValue.current = false;
      return;
    }
    const at = position.value.value;
    if (at === 0 || at === 1) {
      curveMode.value = CURVE_BACK;
    }
    animateTo(position, value ? 1 : 0, TOGGLE_MS);
    // The controllers are stable; only a new value animates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // The painter, once per frame.
  const paint = useDerivedValue(() => {
    const t = clampUnit(position.value.value);
    const status = position.status.value;
    const mode = curveMode.value;
    const visual = curved(
      t,
      position.curveDirection.value,
      status,
      x =>
        mode === CURVE_BACK
          ? transformCubic(Curves.easeOutBack, x)
          : mode === CURVE_LINEAR
          ? x
          : transformCubic(Curves.easeIn, x),
      mode === CURVE_BACK
        ? x => transformFlipped(Curves.easeOutBack, x)
        : mode === CURVE_LINEAR
        ? null
        : x => transformCubic(Curves.easeOut, x),
    );
    const colorValue = curved(
      t,
      position.curveDirection.value,
      status,
      x => transformCubic(Curves.easeOut, x),
      x => transformCubic(Curves.easeIn, x),
    );
    const reactionValue = transformCubic(
      Curves.fastOutSlowIn,
      clampUnit(reaction.value.value),
    );
    const reactionCompleted = reaction.status.value === COMPLETED;
    const reactionDismissed = reaction.status.value === DISMISSED;

    if (reactionCompleted) {
      pressedInactiveRadius.value = lerp(
        INACTIVE_RADIUS,
        PRESSED_RADIUS,
        reactionValue,
      );
      pressedActiveRadius.value = lerp(
        ACTIVE_RADIUS,
        PRESSED_RADIUS,
        reactionValue,
      );
    }
    if (t === 0) {
      pressedInactiveRadius.value = lerp(
        INACTIVE_RADIUS,
        PRESSED_RADIUS,
        reactionValue,
      );
      pressedActiveRadius.value = ACTIVE_RADIUS;
    }
    if (t === 1) {
      pressedActiveRadius.value = lerp(
        ACTIVE_RADIUS,
        PRESSED_RADIUS,
        reactionValue,
      );
      pressedInactiveRadius.value = INACTIVE_RADIUS;
    }
    const inactiveSize =
      2 *
      (pressedInactiveRadius.value < 0
        ? INACTIVE_RADIUS
        : pressedInactiveRadius.value);
    const activeSize =
      2 *
      (pressedActiveRadius.value < 0
        ? ACTIVE_RADIUS
        : pressedActiveRadius.value);

    let width: number;
    let height: number;
    if (reactionCompleted) {
      width = 2 * PRESSED_RADIUS;
      height = 2 * PRESSED_RADIUS;
    } else if (status === DISMISSED || status === FORWARD) {
      const grow = (x: number) => transformCubic(GROW, x);
      const settle = (x: number) => transformCubic(SETTLE, x);
      width = sizeSequence(t, [
        [11, inactiveSize, TRANSITIONAL_WIDTH, grow],
        [72, TRANSITIONAL_WIDTH, activeSize, settle],
        [17, activeSize, activeSize, null],
      ]);
      height = sizeSequence(t, [
        [11, inactiveSize, TRANSITIONAL_HEIGHT, grow],
        [72, TRANSITIONAL_HEIGHT, activeSize, settle],
        [17, activeSize, activeSize, null],
      ]);
    } else {
      const settle = (x: number) => transformFlipped(SETTLE, x);
      const grow = (x: number) => transformFlipped(GROW, x);
      width = sizeSequence(t, [
        [17, inactiveSize, inactiveSize, null],
        [72, inactiveSize, TRANSITIONAL_WIDTH, settle],
        [11, TRANSITIONAL_WIDTH, activeSize, grow],
      ]);
      height = sizeSequence(t, [
        [17, inactiveSize, inactiveSize, null],
        [72, inactiveSize, TRANSITIONAL_HEIGHT, settle],
        [11, TRANSITIONAL_HEIGHT, activeSize, grow],
      ]);
    }

    let thumbColor: string;
    if (!reactionDismissed) {
      thumbColor = lerpColor(
        colors.inactivePressedThumb,
        colors.activeThumb,
        colorValue,
      );
    } else if (status === FORWARD) {
      thumbColor = lerpColor(
        colors.inactivePressedThumb,
        colors.activeThumb,
        colorValue,
      );
    } else if (status === REVERSE) {
      thumbColor = lerpColor(
        colors.inactiveThumb,
        colors.activeThumb,
        colorValue,
      );
    } else {
      thumbColor = lerpColor(
        colors.inactiveThumb,
        colors.activeThumb,
        colorValue,
      );
    }

    const thumbLeft =
      TRACK_LEFT + TRACK_RADIUS - width / 2 + visual * TRACK_INNER_LENGTH;
    const thumbTop = TRACK_TOP - (height / 2 - TRACK_RADIUS);
    return {
      trackColor: lerpColor(
        colors.inactiveTrack,
        colors.activeTrack,
        colorValue,
      ),
      outlineColor: lerpColor(
        colors.inactiveOutline,
        colors.activeOutline,
        colorValue,
      ),
      thumbLeft,
      thumbTop,
      width,
      height,
      thumbColor,
      reactionRadius: reactionDismissed ? 0 : SPLASH_RADIUS * reactionValue,
      reactionX: thumbLeft + height / 2,
      reactionColor: lerpColor(
        colors.inactiveReaction,
        colors.activeReaction,
        visual,
      ),
    };
  });

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: paint.value.trackColor,
    borderColor: paint.value.outlineColor,
  }));
  const reactionStyle = useAnimatedStyle(() => {
    const r = paint.value.reactionRadius;
    return {
      opacity: r > 0 ? 1 : 0,
      left: paint.value.reactionX - r,
      top: HEIGHT / 2 - r,
      width: 2 * r,
      height: 2 * r,
      borderRadius: r,
      backgroundColor: paint.value.reactionColor,
    };
  });
  const thumbStyle = useAnimatedStyle(() => ({
    left: paint.value.thumbLeft,
    top: paint.value.thumbTop,
    width: paint.value.width,
    height: paint.value.height,
    borderRadius: paint.value.height / 2,
    backgroundColor: paint.value.thumbColor,
  }));

  // Gestures. Kept in a ref so the responder, made once, always sees the current props.
  const latest = useRef({ value, onChanged });
  latest.current = { value, onChanged };
  const responder = useMemo(() => {
    let downTimer: ReturnType<typeof setTimeout> | null = null;
    let downSent = false;
    let tapCancelled = false;
    let dragging = false;
    let lastDx = 0;

    const tapDown = () => {
      downSent = true;
      animateTo(reaction, 1, REACTION_MS);
    };
    // _handleTapEnd (onTapUp / onTapCancel).
    const tapEnd = () => animateTo(reaction, 0, REACTION_MS);
    const clearTimer = () => {
      if (downTimer !== null) {
        clearTimeout(downTimer);
        downTimer = null;
      }
    };
    const cancelTap = () => {
      clearTimer();
      if (downSent && !tapCancelled) {
        tapEnd();
      }
      tapCancelled = true;
    };
    const animateToValue = () =>
      animateTo(position, latest.current.value ? 1 : 0, TOGGLE_MS);

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => !dragging,
      onPanResponderGrant: () => {
        downSent = false;
        tapCancelled = false;
        dragging = false;
        downTimer = setTimeout(() => {
          downTimer = null;
          tapDown();
        }, PRESS_TIMEOUT_MS);
      },
      onPanResponderMove: (_event, gesture) => {
        if (dragging) {
          // _handleDragUpdate: linear, by the finger's movement over the track's inner length.
          curveMode.value = CURVE_LINEAR;
          const delta = (gesture.dx - lastDx) / TRACK_INNER_LENGTH;
          lastDx = gesture.dx;
          jumpTo(
            position,
            Math.min(1, Math.max(0, position.value.value + delta)),
          );
          return;
        }
        if (Math.abs(gesture.dx) > TOUCH_SLOP) {
          // The horizontal drag wins the arena; the tap is rejected. Movement counts from here
          // (DragStartBehavior.start).
          cancelTap();
          dragging = true;
          lastDx = gesture.dx;
          animateTo(reaction, 1, REACTION_MS); // _handleDragStart
        } else if (Math.abs(gesture.dy) > TOUCH_SLOP) {
          cancelTap();
        }
      },
      onPanResponderRelease: () => {
        if (dragging) {
          // _handleDragEnd: flip if the thumb ended on the other half, else settle back.
          const { value: current, onChanged: change } = latest.current;
          if (position.value.value >= 0.5 !== current) {
            change(!current);
          } else {
            animateToValue();
          }
          animateTo(reaction, 0, REACTION_MS);
          dragging = false;
          return;
        }
        if (tapCancelled) {
          return;
        }
        clearTimer();
        if (!downSent) {
          tapDown();
        }
        tapEnd();
        latest.current.onChanged(!latest.current.value);
      },
      onPanResponderTerminate: () => {
        if (dragging) {
          animateTo(reaction, 0, REACTION_MS);
          animateToValue();
          dragging = false;
          return;
        }
        cancelTap();
      },
    });
    // Built once: the controllers are stable and the props are read through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={styles.box}
      // One semantics node (Semantics(toggled: value)), as Flutter's Switch is.
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      {...responder.panHandlers}
    >
      <Animated.View style={[styles.track, trackStyle]} />
      <Animated.View style={[styles.layer, reactionStyle]} />
      <Animated.View style={[styles.layer, thumbStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: WIDTH, height: HEIGHT },
  track: {
    position: 'absolute',
    left: TRACK_LEFT,
    top: TRACK_TOP,
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    borderWidth: 2,
  },
  layer: { position: 'absolute' },
});
