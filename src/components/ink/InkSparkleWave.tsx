// The "wave" of Flutter's InkSparkle, the Android splash in Material 3 (material/ink_sparkle.dart and
// shaders/ink_sparkle.frag, Flutter 3.41.9):
//
// - Runs 617 ms from the press, whatever the finger does next (InkSparkle has no cancel).
// - Radius: maxRadius × radiusScale, where maxRadius = half the box diagonal × 2.3 and radiusScale
//   follows fastOutSlowIn over the first 75%, then holds at 1.
// - Centre: from the touch point to the box centre, over the first half of radiusScale.
// - Opacity: 0 → 1 over the first 13%, holds to 40%, back to 0 by the end; times the colour's
//   alpha (the splash colour's 0.1).
// - Edge: soft_circle with blur 1: fully on inside 0.5 × radius, gone at 1.5 × radius, smoothstep
//   between.
// The sparkles (white specks on the ring, from noise) are not drawn (PARITY_ISSUES P3).
//
// The wave is drawn once at BASE_SIZE and scaled up to its real size. react-native-svg paints at
// the view's size on the UI thread, and a full-width button's wave is about 1200 dp across: a
// 3600 × 3600 px image at 3×, which took a 150 ms frame on the RMX5070 and froze whatever else was
// moving, such as the Debug Info panel's slide (measured 2026-10-14). The gradient is smooth, so
// drawing it small and scaling it looks the same.

import React from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export const SPARKLE_MS = 617;
const RADIUS_MULTIPLIER = 2.3;
const BASE_SIZE = 96;
const fastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);

// Sampled once: radiusScale and centre progress as functions of t (0..1).
const SAMPLES = 24;
const tSamples = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
const radiusScaleAt = (t: number) => fastOutSlowIn(Math.min(t / 0.75, 1));
const radiusSamples = tSamples.map(radiusScaleAt);
const centreSamples = radiusSamples.map(r => Math.min(r * 2, 1));

// smoothstep(0.5, 1.5, d / r) across the gradient, whose radius is 1.5 r.
const smoothstep = (e0: number, e1: number, x: number) => {
  const k = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return k * k * (3 - 2 * k);
};
const STOPS = Array.from({ length: 13 }, (_, i) => {
  const offset = i / 12; // fraction of 1.5 r
  return { offset, opacity: 1 - smoothstep(0.5, 1.5, offset * 1.5) };
});

export type SparkleSpec = {
  key: number;
  x: number;
  y: number;
  width: number;
  height: number;
  t: Animated.Value;
};

export function startSparkle(
  spec: Omit<SparkleSpec, 't' | 'key'>,
  key: number,
  onDone: () => void,
): SparkleSpec {
  const t = new Animated.Value(0);
  Animated.timing(t, {
    toValue: 1,
    duration: SPARKLE_MS,
    easing: Easing.linear,
    useNativeDriver: true,
  }).start(onDone);
  return { ...spec, key, t };
}

/** Splits 'rgba(r, g, b, a)' / '#RRGGBB' into an opaque colour and its alpha (SVG stops ignore
 * the alpha inside the colour). */
export function splitAlpha(color: string): { rgb: string; alpha: number } {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = '1'] = m[1].split(',').map(part => part.trim());
    return { rgb: `rgb(${r}, ${g}, ${b})`, alpha: Number(a) };
  }
  return { rgb: color, alpha: 1 };
}

export function InkSparkleWave({
  spec,
  color,
}: {
  spec: SparkleSpec;
  color: string;
}) {
  const { width, height, x, y, t } = spec;
  const { rgb, alpha } = splitAlpha(color);
  const maxRadius =
    (Math.sqrt(width * width + height * height) / 2) * RADIUS_MULTIPLIER;
  const extent = maxRadius * 1.5; // the soft edge reaches 1.5 × radius
  const upscale = (extent * 2) / BASE_SIZE;
  const centre = t.interpolate({
    inputRange: tSamples,
    outputRange: centreSamples,
  });
  const opacity = t.interpolate({
    inputRange: [0, 0.13, 0.4, 1],
    outputRange: [0, 1, 1, 0],
  });
  const scale = t.interpolate({
    inputRange: tSamples,
    outputRange: radiusSamples.map(r => Math.max(r, 0.0001) * upscale),
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wave,
        {
          width: BASE_SIZE,
          height: BASE_SIZE,
          left: -BASE_SIZE / 2,
          top: -BASE_SIZE / 2,
          opacity,
          transform: [
            {
              translateX: centre.interpolate({
                inputRange: [0, 1],
                outputRange: [x, width / 2],
              }),
            },
            {
              translateY: centre.interpolate({
                inputRange: [0, 1],
                outputRange: [y, height / 2],
              }),
            },
            { scale },
          ],
        },
      ]}
    >
      <Svg width={BASE_SIZE} height={BASE_SIZE}>
        <Defs>
          <RadialGradient id="wave" cx="50%" cy="50%" r="50%">
            {STOPS.map(stop => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={rgb}
                stopOpacity={stop.opacity * alpha}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Circle
          cx={BASE_SIZE / 2}
          cy={BASE_SIZE / 2}
          r={BASE_SIZE / 2}
          fill="url(#wave)"
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wave: { position: 'absolute' },
});
