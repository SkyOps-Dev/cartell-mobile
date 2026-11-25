// Port of SpinKitFadingFour from flutter_spinkit 5.2.2 (lib/src/fading_four.dart), the pairing
// wizard's waiting spinner: four dots of `color` on a `size` square (50), each a circle of a
// quarter of the size, centred in one quadrant (bottom-right, bottom-left, top-left, top-right:
// the bottom-right quarter box turned by 0°, 90°, 180°, 270° about the centre). Each fades in and
// out on its own phase: opacity = (sin((t − delay) × 2π) + 1) / 2, t running 0 → 1 linearly every
// 1200 ms, delays 0, −0.9, −0.6, −0.3. Centred across its parent. Runs on the native driver.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const CYCLE_MS = 1200;
const DELAYS = [0, -0.9, -0.6, -0.3];
/** Sample points of the sine fade per cycle (the native driver interpolates linearly between). */
const SAMPLES = 48;

/** DelayTween over a 0 → 1 value, sampled for Animated.interpolate. */
function opacityCurve(delay: number) {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    inputRange.push(t);
    outputRange.push((Math.sin((t - delay) * 2 * Math.PI) + 1) / 2);
  }
  return { inputRange, outputRange };
}

const curves = DELAYS.map(opacityCurve);

type Props = { color: string; size?: number };

export function SpinKitFadingFour({ color, size = 50 }: Props) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const dot = size * 0.25;
  // The dot's centre in each quadrant, clockwise from bottom-right.
  const centres = [
    [0.75, 0.75],
    [0.25, 0.75],
    [0.25, 0.25],
    [0.75, 0.25],
  ];
  return (
    <View style={styles.center}>
      <View testID="spin-kit-fading-four" style={{ width: size, height: size }}>
        {centres.map(([x, y], i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                left: x * size - dot / 2,
                top: y * size - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: color,
                opacity: t.interpolate(curves[i]),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignSelf: 'stretch', alignItems: 'center' },
  dot: { position: 'absolute' },
});
