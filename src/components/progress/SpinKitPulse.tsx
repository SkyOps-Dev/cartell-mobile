// Port of SpinKitPulse from flutter_spinkit 5.2.2 (lib/src/pulse.dart), Add Sensor's search
// (spec 13 §7): a filled circle of `size` that grows from nothing to full size while fading out,
// once a second (Curves.easeInOut over the cycle), repeating from the start.
//
// Center → Opacity(1 − t) → Transform.scale(t) → SizedBox(size) → a circle in `color`, where t is
// the eased cycle position. Runs on the native driver.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const CYCLE_MS = 1000;
// Curves.easeInOut = Cubic(0.42, 0.0, 0.58, 1.0)
const easeInOut = Easing.bezier(0.42, 0.0, 0.58, 1.0);

type Props = { color: string; size?: number };

export function SpinKitPulse({ color, size = 50 }: Props) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  return (
    <View style={styles.center}>
      <Animated.View
        testID="spin-kit-pulse"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: t }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
