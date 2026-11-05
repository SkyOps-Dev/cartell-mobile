// Port of badges 3.2.0's Badge (lib/src/badge.dart), as the app uses it: a red circle around a
// fixed-size empty box, its top-right corner 8 above and 10 right of the child's (BadgePosition
// .topEnd). The default slide animation: when shown it slides in from (−0.5, 0.9) of its own size
// over 500 ms on Curves.elasticOut, and fades in over 200 ms; hiding runs both back.
//
// A hidden badge is still there: Opacity(0) keeps hit-testing, and it sits at the slide's start,
// so it swallows taps on whatever it covers (on the Hubs list, a 40 dp square of the card just
// below its top-right corner). RN does the same: the badge is always drawn, and touches on it never
// reach the child, its sibling.
// Its Material has type transparency, so its elevation draws no shadow.

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MaterialColors } from '../theme/colors';
import { clampUnit, transformElasticOut } from '../theme/curves';

const ANIMATION_MS = 500;
const APPEARANCE_MS = 200;

type Props = {
  showBadge: boolean;
  /** badgeContent: a SizedBox of this size. */
  contentWidth: number;
  contentHeight: number;
  /** BadgeStyle.padding (default 5 all round). */
  padding?: { left: number; top: number; right: number; bottom: number };
  /** StackFit.passthrough: the child gets the Badge's own constraints (else loose). */
  passthrough?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
};

const DEFAULT_PADDING = { left: 5, top: 5, right: 5, bottom: 5 };

export function Badge({
  showBadge,
  contentWidth,
  contentHeight,
  padding = DEFAULT_PADDING,
  passthrough = false,
  style,
  children,
}: Props) {
  const width = padding.left + contentWidth + padding.right;
  const height = padding.top + contentHeight + padding.bottom;
  const diameter = Math.min(width, height);
  // The AnimationControllers' values, run linearly; the curve is applied when drawn.
  const slide = useSharedValue(0);
  const appearance = useSharedValue(0);
  const wasShown = useRef<boolean | null>(null);

  useEffect(() => {
    const previous = wasShown.current;
    wasShown.current = showBadge;
    // initState forwards only a badge shown from the start; didUpdateWidget handles a change.
    if (previous === showBadge || (previous === null && !showBadge)) {
      return;
    }
    const target = showBadge ? 1 : 0;
    const run = (value: typeof slide, ms: number) => {
      value.value = withTiming(target, {
        duration: ms * Math.abs(target - value.value),
        easing: Easing.linear,
      });
    };
    run(slide, ANIMATION_MS);
    run(appearance, APPEARANCE_MS);
  }, [showBadge, slide, appearance]);

  const animated = useAnimatedStyle(() => {
    // SlideTransition: Tween(begin (−0.5, 0.9), end (0, 0)) of the badge's own size.
    const remaining = 1 - transformElasticOut(clampUnit(slide.value));
    return {
      opacity: clampUnit(appearance.value),
      transform: [
        { translateX: -0.5 * width * remaining },
        { translateY: 0.9 * height * remaining },
      ],
    };
  });

  return (
    <View style={[passthrough ? styles.passthrough : styles.loose, style]}>
      {children}
      {/* Only the circle hit-tests (DecoratedBox), so the box around it lets touches through. */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.position, { width, height }, animated]}
      >
        {/* BoxShape.circle: a circle of the shorter side, centred in the box. */}
        <View
          style={[
            styles.circle,
            {
              width: diameter,
              height: diameter,
              left: (width - diameter) / 2,
              top: (height - diameter) / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  passthrough: { alignSelf: 'stretch' },
  loose: { alignSelf: 'center' },
  // BadgePosition.topEnd(): top −8, end −10.
  position: { position: 'absolute', top: -8, right: -10 },
  circle: {
    position: 'absolute',
    backgroundColor: MaterialColors.red,
    borderRadius: 9999,
  },
});
