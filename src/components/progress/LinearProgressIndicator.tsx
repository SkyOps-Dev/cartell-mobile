// Port of Flutter's indeterminate LinearProgressIndicator with Material 3 `year2023` defaults
// (material/progress_indicator.dart, Flutter 3.41.9), as the pairing wizard's reset screen uses it.
//
// The bar fills its parent's width, at least 4 tall (minHeight), stretched to the height it is
// given. The track (backgroundColor) fills it; two value-coloured lines run across it, left to
// right, every 1800 ms. Their ends, as fractions of the width, follow four Interval curves of the
// linear cycle position t (the painter's line1Head, line1Tail, line2Head, line2Tail):
//   line 1: head Interval(0, 750/1800, Cubic(0.2, 0, 0.8, 1)),
//           tail Interval(333/1800, 1083/1800, Cubic(0.4, 0, 1, 1));
//   line 2: head Interval(1000/1800, 1567/1800, Cubic(0, 0, 0.65, 1)),
//           tail Interval(1267/1800, 1800/1800, Cubic(0.1, 0, 0.45, 1)).
// year2023 has no border radius, track gap or stop indicator: plain rectangles, the track under
// the lines. Evaluated per frame on the UI thread, as Flutter's ticker repaints the painter.

import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { transformInterval } from '../../theme/curves';

const CYCLE_MS = 1800;

/** The two lines' [tail, head] fractions at cycle position t. Exported for tests. */
export function linesAt(t: number): [[number, number], [number, number]] {
  'worklet';
  return [
    [
      transformInterval(
        333 / CYCLE_MS,
        (333 + 750) / CYCLE_MS,
        t,
        [0.4, 0, 1, 1],
      ),
      transformInterval(0, 750 / CYCLE_MS, t, [0.2, 0, 0.8, 1]),
    ],
    [
      transformInterval(
        1267 / CYCLE_MS,
        (1267 + 533) / CYCLE_MS,
        t,
        [0.1, 0, 0.45, 1],
      ),
      transformInterval(
        1000 / CYCLE_MS,
        (1000 + 567) / CYCLE_MS,
        t,
        [0, 0, 0.65, 1],
      ),
    ],
  ];
}

/** A line from `tail` to `head` across a bar `width` wide (none when it has no length). */
function lineBox([tail, head]: [number, number], width: number) {
  'worklet';
  return { left: tail * width, width: Math.max(head - tail, 0) * width };
}

type Props = { backgroundColor: string; valueColor: string };

export function LinearProgressIndicator({
  backgroundColor,
  valueColor,
}: Props) {
  const [width, setWidth] = useState(0);
  const elapsed = useSharedValue(0);
  useFrameCallback(frame => {
    elapsed.value = frame.timeSinceFirstFrame;
  });

  const line1 = useAnimatedStyle(() =>
    lineBox(linesAt((elapsed.value % CYCLE_MS) / CYCLE_MS)[0], width),
  );
  const line2 = useAnimatedStyle(() =>
    lineBox(linesAt((elapsed.value % CYCLE_MS) / CYCLE_MS)[1], width),
  );

  return (
    <View
      accessibilityRole="progressbar"
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
      style={[styles.track, { backgroundColor }]}
    >
      <Animated.View
        style={[styles.line, { backgroundColor: valueColor }, line1]}
      />
      <Animated.View
        style={[styles.line, { backgroundColor: valueColor }, line2]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { alignSelf: 'stretch', flex: 1, minHeight: 4, overflow: 'hidden' },
  line: { position: 'absolute', top: 0, bottom: 0 },
});
