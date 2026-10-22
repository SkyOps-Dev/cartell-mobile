// Flutter's animation curves (animation/curves.dart, Flutter 3.41.9) as worklets, so animated
// styles can evaluate them on the UI thread exactly as Flutter does.

export type CubicCurve = readonly [number, number, number, number];

/**
 * An AnimationController's value is always within 0–1. Reanimated's linear withTiming is not: an
 * animation started between frames is stepped with the next frame's timestamp, which can be
 * earlier than its start, so its first value lands slightly past where it began.
 */
export function clampUnit(t: number): number {
  'worklet';
  return Math.min(1, Math.max(0, t));
}

/**
 * Cubic.transform: bisection on x to within 0.001, then y at that parameter, as curves.dart does
 * it. Every curve returns t unchanged at 0 and 1 (ParametricCurve.transform).
 * Flutter asserts 0 ≤ t ≤ 1; outside it (or NaN) the bisection never ends, and on the UI thread
 * that froze the app until Android killed it (2026-10-22). So anything outside is clamped.
 */
export function transformCubic(curve: CubicCurve, t: number): number {
  'worklet';
  if (!(t > 0)) {
    return 0;
  }
  if (!(t < 1)) {
    return 1;
  }
  const [a, b, c, d] = curve;
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

/** FlippedCurve: 1 − curve(1 − t). */
export function transformFlipped(curve: CubicCurve, t: number): number {
  'worklet';
  if (!(t > 0)) {
    return 0;
  }
  if (!(t < 1)) {
    return 1;
  }
  return 1 - transformCubic(curve, 1 - t);
}

export const Curves = {
  easeIn: [0.42, 0.0, 1.0, 1.0],
  easeInOut: [0.42, 0.0, 0.58, 1.0],
  easeOut: [0.0, 0.0, 0.58, 1.0],
  easeOutBack: [0.175, 0.885, 0.32, 1.275],
  fastOutSlowIn: [0.4, 0.0, 0.2, 1.0],
} as const satisfies Record<string, CubicCurve>;
