// Port of Flutter's CircularProgressIndicator with Material 3 `year2023` defaults
// (progress_indicator.dart; spec 07 §3.1).
//
// Indeterminate (no `value`): 36 × 36, stroke 4 centred on the radius, square cap, colour primary
// #D0BCFF, no track. Motion, from _CircularProgressIndicatorState / _CircularProgressIndicatorPainter:
//   path phase p = (t mod 1333 ms) / 1333, rotation phase r = (t mod 2222 ms) / 2222
//   head = fastOutSlowIn(Interval(0, 0.5)(p)), tail = fastOutSlowIn(Interval(0.5, 1)(p))
//   arcStart = −π/2 + tail·1.5π + r·2π + p·0.5π
//   arcSweep = max((head − tail)·1.5π, 0.001)
//
// Determinate (`value`, the firmware update's ring), from the same painter: the track (when a
// `backgroundColor` is given) is drawn first, a full circle (sweep 2π − 0.001 from 3 o'clock, round
// caps, which close the gap); then the value arc from 12 o'clock, sweep clamp(value, 0, 1) ×
// (2π − 0.001), butt caps. strokeAlign is centre: the stroke straddles the box's edge (radius
// size / 2), half of it outside, as Flutter does not clip the painter. The value may be a shared
// value, so a tween redraws it on the UI thread. Semantics: a progress bar, 0 to 100, its value
// `semanticsValue` (default round(value × 100)).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  isSharedValue,
  type SharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ColorScheme } from '../../theme/colors';
import { AnimatedArc, arcPath } from './AnimatedArc';

const PATH_MS = 1333;
const ROTATION_MS = 2222;
const EPSILON = 0.001;
// Canvas.drawArc(r, 0, 2π) draws nothing, so Flutter sweeps just short of it.
const SWEEP = Math.PI * 2 - EPSILON;
const START_ANGLE = -Math.PI / 2;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Flutter's Cubic.transform: bisection to within 0.001, as curves.dart does it. */
function cubic(a: number, b: number, c: number, d: number, t: number): number {
  'worklet';
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  const evaluate = (p1: number, p2: number, m: number) =>
    3 * p1 * (1 - m) * (1 - m) * m + 3 * p2 * (1 - m) * m * m + m * m * m;
  let start = 0;
  let end = 1;
  for (;;) {
    const midpoint = (start + end) / 2;
    const estimate = evaluate(a, c, midpoint);
    if (Math.abs(t - estimate) < 0.001) {
      return evaluate(b, d, midpoint);
    }
    if (estimate < t) {
      start = midpoint;
    } else {
      end = midpoint;
    }
  }
}

/** Curves.fastOutSlowIn = Cubic(0.4, 0.0, 0.2, 1.0) */
function fastOutSlowIn(t: number): number {
  'worklet';
  return cubic(0.4, 0.0, 0.2, 1.0, t);
}

function interval(begin: number, end: number, t: number): number {
  'worklet';
  return Math.min(Math.max((t - begin) / (end - begin), 0), 1);
}

/** Start angle and sweep (radians) of the arc at time `ms`. Exported for tests. */
export function arcAt(ms: number): { start: number; sweep: number } {
  'worklet';
  const p = (ms % PATH_MS) / PATH_MS;
  const r = (ms % ROTATION_MS) / ROTATION_MS;
  const head = fastOutSlowIn(interval(0, 0.5, p));
  const tail = fastOutSlowIn(interval(0.5, 1, p));
  return {
    start:
      -Math.PI / 2 +
      (tail * 3 * Math.PI) / 2 +
      r * Math.PI * 2 +
      p * 0.5 * Math.PI,
    sweep: Math.max(((head - tail) * 3 * Math.PI) / 2, EPSILON),
  };
}

/** The determinate value arc's sweep for `value`. Exported for tests. */
export function determinateSweep(value: number): number {
  'worklet';
  return Math.min(Math.max(value, 0), 1) * SWEEP;
}

type Props = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** Determinate when given: 0 to 1 (above 1 draws full). */
  value?: number | SharedValue<number>;
  /** The track (determinate only, as the app uses it). */
  backgroundColor?: string;
  semanticsLabel?: string;
  semanticsValue?: string;
};

export function CircularProgressIndicator({
  size = 36,
  strokeWidth = 4,
  color = ColorScheme.primary,
  value,
  backgroundColor,
  semanticsLabel,
  semanticsValue,
}: Props) {
  if (value === undefined) {
    return (
      <AnimatedArc
        size={size}
        strokeWidth={strokeWidth}
        color={color}
        arcAt={arcAt}
      />
    );
  }
  return (
    <DeterminateArc
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      value={value}
      backgroundColor={backgroundColor}
      semanticsLabel={semanticsLabel}
      semanticsValue={semanticsValue}
    />
  );
}

function DeterminateArc({
  size,
  strokeWidth,
  color,
  value,
  backgroundColor,
  semanticsLabel,
  semanticsValue,
}: Required<Pick<Props, 'size' | 'strokeWidth' | 'color' | 'value'>> &
  Pick<Props, 'backgroundColor' | 'semanticsLabel' | 'semanticsValue'>) {
  const shared = isSharedValue<number>(value) ? value : null;
  const fixed = isSharedValue<number>(value) ? 0 : value;
  // The canvas reaches half the stroke past the box on every side.
  const canvas = size + strokeWidth;
  const centre = canvas / 2;
  const radius = size / 2;
  const animatedProps = useAnimatedProps(() => {
    const current = shared === null ? fixed : shared.value;
    return {
      d: arcPath(centre, radius, START_ANGLE, determinateSweep(current)),
    };
  });
  // A shared value is not read during render: its caller passes semanticsValue.
  let now: number | undefined;
  if (semanticsValue !== undefined) {
    now = Number(semanticsValue);
  } else if (shared === null) {
    now = Math.round(fixed * 100);
  }

  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={semanticsLabel}
      accessibilityValue={{ min: 0, max: 100, now }}
    >
      <Svg width={canvas} height={canvas} style={{ margin: -strokeWidth / 2 }}>
        {backgroundColor !== undefined && (
          <Circle
            cx={centre}
            cy={centre}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        )}
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'visible' },
});
