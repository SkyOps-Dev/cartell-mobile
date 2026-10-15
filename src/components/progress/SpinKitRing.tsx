// Port of SpinKitRing from flutter_spinkit 5.2.2 (lib/src/ring.dart; spec 07 §3.1), the Loading
// screen's spinner: size 50, line width 7, square caps, one cycle every 1200 ms.
//
// Per cycle t (0..1), from _SpinKitRingState:
//   rotation = t · 5π/6 (the whole box turns)
//   start    = π · (−2/3, then linear to 1/2 over the second half)
//   sweep    = 2π · (0.25 → 5/6 → 0.25, a triangle peaking at t = 0.5)
// The angles meet again at the wrap, so the ring moves without a jump.

import React from 'react';

import { AnimatedArc } from './AnimatedArc';

const CYCLE_MS = 1200;

/** Start angle (rotation included) and sweep of the ring at `ms`. Exported for tests. */
export function ringArcAt(ms: number): { start: number; sweep: number } {
  'worklet';
  const t = (ms % CYCLE_MS) / CYCLE_MS;
  const rotation = (t * 5 * Math.PI) / 6;
  const secondHalf = Math.min(Math.max((t - 0.5) / 0.5, 0), 1);
  const startFraction = -2 / 3 + secondHalf * (1 / 2 + 2 / 3);
  const ringCurve = t <= 0.5 ? 2 * t : 2 * (1 - t);
  const progress = 0.25 + ringCurve * (5 / 6 - 0.25);
  return {
    start: rotation + Math.PI * startFraction,
    sweep: 2 * Math.PI * progress,
  };
}

type Props = {
  color: string;
  size?: number;
  lineWidth?: number;
};

export function SpinKitRing({ color, size = 50, lineWidth = 7 }: Props) {
  return (
    <AnimatedArc
      size={size}
      strokeWidth={lineWidth}
      color={color}
      arcAt={ringArcAt}
    />
  );
}
