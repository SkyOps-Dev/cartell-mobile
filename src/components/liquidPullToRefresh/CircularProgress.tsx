// Port of liquid_pull_to_refresh 3.0.1's lib/src/circular_progress.dart: the indicator in the
// middle of the band, a filled circle (innerCircleRadius) inside a stroked arc (RingPainter) that
// has its own opacity. Both are drawn in the background colour.
//
// Flutter lays it out in a square of 2 × max(ring radius, inner radius), with the ring's box at the
// square's top left and the circle centred. Whenever the ring can be seen (opacity above 0) its
// radius is at least 20 % of the band height and the circle's at most 15 %, so the ring fills the
// square and both share its centre. Here both are drawn around the centre of a fixed canvas, which
// the caller positions; every value comes from the UI thread, so nothing goes through React per
// frame.
//
// RingPainter: an arc of 2π × progressPercent from startAngle (radians, clockwise from 3 o'clock),
// stroke progressCircleBorderWidth with square caps, on a radius of (2 × ring radius − stroke) / 2.

import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { arcPath } from '../progress/AnimatedArc';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** CircularProgress's constructor arguments that change from frame to frame. */
export type CircularProgressFrame = {
  innerCircleRadius: number;
  progressPercent: number;
  progressCircleOpacity: number;
  progressCircleRadius: number;
  startAngle: number;
};

type Props = {
  frame: Readonly<SharedValue<CircularProgressFrame>>;
  /** Width and height of the canvas; the indicator is drawn around its centre. */
  canvasSize: number;
  progressCircleBorderWidth: number;
  backgroundColor: string;
};

export function CircularProgress({
  frame,
  canvasSize,
  progressCircleBorderWidth,
  backgroundColor,
}: Props) {
  const centre = canvasSize / 2;
  const ring = useAnimatedProps(() => {
    const { progressCircleRadius, progressPercent, startAngle } = frame.value;
    const radius = progressCircleRadius - progressCircleBorderWidth / 2;
    return {
      d:
        radius > 0
          ? arcPath(centre, radius, startAngle, 2 * Math.PI * progressPercent)
          : 'M 0 0',
      opacity: frame.value.progressCircleOpacity,
    };
  });
  const inner = useAnimatedProps(() => ({
    r: Math.max(0, frame.value.innerCircleRadius),
  }));

  return (
    <Svg width={canvasSize} height={canvasSize} style={styles.canvas}>
      <AnimatedPath
        animatedProps={ring}
        stroke={backgroundColor}
        strokeWidth={progressCircleBorderWidth}
        strokeLinecap="square"
        fill="none"
      />
      <AnimatedCircle
        animatedProps={inner}
        cx={centre}
        cy={centre}
        fill={backgroundColor}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  canvas: { overflow: 'visible' },
});
