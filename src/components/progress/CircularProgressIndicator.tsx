// Port of Flutter's indeterminate CircularProgressIndicator with Material 3 `year2023` defaults
// (progress_indicator.dart; spec 07 §3.1): 36 × 36, stroke 4 centred on the radius, square cap,
// colour primary #D0BCFF, no track.
//
// Motion, from _CircularProgressIndicatorState / _CircularProgressIndicatorPainter:
//   path phase p = (t mod 1333 ms) / 1333, rotation phase r = (t mod 2222 ms) / 2222
//   head = fastOutSlowIn(Interval(0, 0.5)(p)), tail = fastOutSlowIn(Interval(0.5, 1)(p))
//   arcStart = −π/2 + tail·1.5π + r·2π + p·0.5π
//   arcSweep = max((head − tail)·1.5π, 0.001)

import React from 'react';

import { ColorScheme } from '../../theme/colors';
import { AnimatedArc } from './AnimatedArc';

const PATH_MS = 1333;
const ROTATION_MS = 2222;
const EPSILON = 0.001;

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

type Props = {
  size?: number;
  strokeWidth?: number;
  color?: string;
};

export function CircularProgressIndicator({
  size = 36,
  strokeWidth = 4,
  color = ColorScheme.primary,
}: Props) {
  return (
    <AnimatedArc
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      arcAt={arcAt}
    />
  );
}
