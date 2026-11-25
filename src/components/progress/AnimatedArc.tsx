// A stroked arc whose start angle and sweep are a function of time, redrawn on the UI thread every
// frame (as Flutter's ticker repaints its CustomPainter): the shared engine of the progress
// spinners, CircularProgressIndicator and SpinKitRing. Nothing goes through React per frame.
//
// Angles are in radians, clockwise from 3 o'clock, as Canvas.drawArc takes them. The stroke is
// centred on a radius of (size − strokeWidth) / 2 with square caps. Flutter does not clip a
// CustomPaint, so the canvas reaches strokeWidth past the box on every side for the caps.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The arc at `ms` since the spinner appeared. Must be a worklet. */
export type ArcAt = (ms: number) => { start: number; sweep: number };

/** SVG path of an arc around (c, c); `sweep` is below 2π. */
export function arcPath(
  c: number,
  radius: number,
  start: number,
  sweep: number,
): string {
  'worklet';
  const x1 = c + radius * Math.cos(start);
  const y1 = c + radius * Math.sin(start);
  const x2 = c + radius * Math.cos(start + sweep);
  const y2 = c + radius * Math.sin(start + sweep);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

type Props = {
  size: number;
  strokeWidth: number;
  color: string;
  arcAt: ArcAt;
  /**
   * A full circle under the arc (CircularProgressIndicator's backgroundColor, the pairing
   * wizard's reconnect ring). With a track, arc and track follow Flutter's painter exactly as the
   * determinate ring does: the stroke centred on the box's edge (radius size / 2). The bare
   * spinners keep the radius above until PARITY P46 is measured.
   */
  trackColor?: string;
};

export function AnimatedArc({
  size,
  strokeWidth,
  color,
  arcAt,
  trackColor,
}: Props) {
  const elapsed = useSharedValue(0);
  useFrameCallback(frame => {
    elapsed.value = frame.timeSinceFirstFrame;
  });

  const onEdge = trackColor !== undefined;
  const canvas = size + strokeWidth * 2;
  const centre = canvas / 2;
  const radius = onEdge ? size / 2 : (size - strokeWidth) / 2;
  const animatedProps = useAnimatedProps(() => {
    const { start, sweep } = arcAt(elapsed.value);
    return { d: arcPath(centre, radius, start, sweep) };
  });

  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
    >
      <Svg width={canvas} height={canvas} style={{ margin: -strokeWidth }}>
        {onEdge && (
          <Circle
            cx={centre}
            cy={centre}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        )}
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="square"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'visible' },
});
