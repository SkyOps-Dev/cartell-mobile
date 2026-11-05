// Port of liquid_pull_to_refresh 3.0.1 (lib/liquid_pull_to_refresh.dart): a vertical scroll view
// that, pulled down from its top, grows a coloured band over itself and, released far enough, plays
// the "liquid" refresh (the band's edge springs, a peak rises, a spinning ring appears) while
// onRefresh runs, then plays it back out.
//
// The state machine is the package's, mode for mode:
//   drag     the pull started at the top of the list (ScrollStartNotification with extentBefore 0);
//   armed    pulled far enough: the band's colour is fully opaque (_valueColor alpha 0xFF), which
//            the position reaches at 2/3 × 254.5/255;
//   snap     released while armed: every controller animates in for
//            springAnimationDurationInMilliseconds;
//   refresh  when the spring lands: the ring spins and onRefresh runs;
//   done     onRefresh finished: everything animates out (durations ÷ animSpeedFactor);
//   canceled released, or pushed back up, before arming: the position returns to 0 in 200 ms.
// Each controller is a shared value animated on the UI thread; the state machine runs in JS, as the
// package's does on Dart's event loop. An animateTo that is interrupted never resolves, as a
// TickerFuture never completes when its controller is stopped.
//
// Where the pull comes from differs by platform, as Flutter's scroll physics do:
// - Android (ClampingScrollPhysics): at the top the list cannot move, and each pixel the finger
//   pulls down is OverscrollNotification, which adds half of it to the drag offset. Here the list
//   cannot report that (the native ScrollView keeps the drag to itself), so a pan gesture running
//   alongside it measures the finger instead. Moving the finger back up scrolls a list that can
//   scroll, which ends the pull (ScrollUpdateNotification with extentBefore above 0); a list that
//   cannot scroll takes it off the drag offset at the same half rate.
// - iOS (BouncingScrollPhysics): the list itself bounces past its top, and the drag offset is how
//   far past it is. Released while armed, the refresh starts at once (the package starts it on the
//   first bounce-back update, one frame later). Not run on an iPhone.
// The overscroll glow is turned off for the pull (_handleGlowNotification disallows it in drag
// mode, and Android decides once, at the first overscroll).
//
// A list can be dragged at all only when its content is taller than it (ScrollPhysics
// .shouldAcceptUserOffset), so a short list cannot be pulled; `alwaysScrollable`
// (AlwaysScrollableScrollPhysics) lets it be. On iOS that is alwaysBounceVertical.
//
// With showChildOpacityTransition the child fades as the band grows; without it, it slides down by
// position × height × 1.5, which keeps it just below the band. Only the scroll view itself is
// ported (the package wraps any child with a Scrollable); show() is not, since no screen calls it.

import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollViewProps,
  StyleSheet,
  View,
} from 'react-native';
import {
  GestureDetector,
  ScrollView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  clampUnit,
  Curves,
  transformCubic,
  transformElasticOut,
  transformInterval,
} from '../../theme/curves';
import { curveHillPath } from './clipper';
import { CircularProgress, CircularProgressFrame } from './CircularProgress';

// The over-scroll distance that moves the indicator to its maximum displacement, as a fraction of
// the scroll view's height.
const kDragContainerExtentPercentage = 0.25;
// How far the drag can overshoot the displacement where the refresh arms.
const kDragSizeFactorLimit = 1.5;
// The canceled pull's return.
const kIndicatorScaleDuration = 200;
// Flutter's touch slop is the platform's: Android's ViewConfiguration (8 dp), iOS's kTouchSlop.
const TOUCH_SLOP = Platform.OS === 'android' ? 8 : 18;

type Mode = 'drag' | 'armed' | 'snap' | 'refresh' | 'done' | 'canceled';

export type LiquidPullToRefreshProps = ScrollViewProps & {
  onRefresh: () => Promise<void>;
  /** The band. Flutter's default is the theme's secondary colour; every caller passes one. */
  color: string;
  /** The ring and the circle. Flutter's default is canvasColor; every caller passes one. */
  backgroundColor: string;
  /** Where the band settles; 100 by default. */
  height?: number;
  springAnimationDurationInMilliseconds?: number;
  animSpeedFactor?: number;
  borderWidth?: number;
  showChildOpacityTransition?: boolean;
  /** AlwaysScrollableScrollPhysics: the list can be pulled even when its content fits. */
  alwaysScrollable?: boolean;
};

const linear = Easing.linear;
const easeOut = (t: number) => {
  'worklet';
  return transformCubic(Curves.easeOut, t);
};
const elasticOut = (t: number) => {
  'worklet';
  return transformElasticOut(t);
};

/**
 * AnimationController.animateTo(target, duration, curve): resolves when it arrives, and never if
 * something else moves the controller first.
 */
function animateTo(
  controller: SharedValue<number>,
  target: number,
  duration: number,
  easing: (t: number) => number = linear,
): Promise<void> {
  return new Promise(resolve => {
    controller.value = withTiming(target, { duration, easing }, finished => {
      if (finished) {
        scheduleOnRN(resolve);
      }
    });
  });
}

/** _valueColor's alpha (round(255 × opacity)) at a position: 255 is where the pull arms. */
function bandAlpha(position: number): number {
  const t = clampUnit(position / (1 / kDragSizeFactorLimit));
  return Math.round(255 * t);
}

export function LiquidPullToRefresh({
  onRefresh,
  color,
  backgroundColor,
  height = 100,
  springAnimationDurationInMilliseconds = 1000,
  animSpeedFactor = 1,
  borderWidth = 2,
  showChildOpacityTransition = true,
  alwaysScrollable = false,
  children,
  onScroll,
  onScrollBeginDrag,
  onScrollEndDrag,
  onMomentumScrollEnd,
  onLayout,
  onContentSizeChange,
  overScrollMode,
  ...scrollViewProps
}: LiquidPullToRefreshProps) {
  // The controllers.
  const spring = useSharedValue(0);
  const progressing = useSharedValue(0);
  const ringDisappear = useSharedValue(0);
  const showPeak = useSharedValue(0);
  const indicatorMoveWithPeak = useSharedValue(0);
  const indicatorTranslateInOut = useSharedValue(0);
  const radius = useSharedValue(0);
  const position = useSharedValue(0);
  // The mode as the UI thread needs it: whether there is one (the child is wrapped), and done.
  const hasMode = useSharedValue(0);
  const isDone = useSharedValue(0);

  const mode = useRef<Mode | null>(null);
  const dragOffset = useRef<number | null>(null);
  const mounted = useRef(true);
  // The scroll view: its offset, its height (viewportDimension), its content's height.
  const scrollY = useRef(0);
  const viewport = useRef(0);
  const contentHeight = useRef(0);
  const userDragging = useRef(false);
  const lastTranslationY = useRef(0);

  // The band and the indicator are only built while there is a mode, as the package builds them.
  const [showsIndicator, setShowsIndicator] = useState(false);
  const [suppressGlow, setSuppressGlow] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setMode = (next: Mode | null) => {
    mode.current = next;
    hasMode.value = next === null ? 0 : 1;
    isDone.value = next === 'done' ? 1 : 0;
    setShowsIndicator(next !== null);
    if (next === null) {
      setSuppressGlow(false);
    }
  };

  const start = () => {
    dragOffset.current = 0;
    position.value = 0;
    spring.value = 0;
    progressing.value = 0;
    ringDisappear.value = 1;
    showPeak.value = 0;
    indicatorMoveWithPeak.value = 0;
    indicatorTranslateInOut.value = 0;
    radius.value = 1;
  };

  const checkDragOffset = () => {
    let newValue =
      dragOffset.current! / (viewport.current * kDragContainerExtentPercentage);
    if (mode.current === 'armed') {
      newValue = Math.max(newValue, 1 / kDragSizeFactorLimit);
    }
    const clamped = Math.min(1, Math.max(0, newValue));
    position.value = clamped;
    if (mode.current === 'drag' && bandAlpha(clamped) === 0xff) {
      mode.current = 'armed';
    }
  };

  const dismiss = async (newMode: 'canceled' | 'done') => {
    await Promise.resolve();
    setMode(newMode);
    if (newMode === 'done') {
      const out = Math.round(
        springAnimationDurationInMilliseconds / animSpeedFactor,
      );
      const quick = Math.round(
        springAnimationDurationInMilliseconds / (animSpeedFactor * 5),
      );
      // _progressingController.stop(): the spin stays where it is.
      cancelAnimation(progressing);
      animateTo(ringDisappear, 1, out);
      animateTo(indicatorMoveWithPeak, 0, out);
      animateTo(indicatorTranslateInOut, 0, out);
      await animateTo(showPeak, 0.3, out);
      animateTo(radius, 0, quick);
      showPeak.value = 0.175;
      await animateTo(showPeak, 0.1, quick, easeOut);
      showPeak.value = 0;
      await animateTo(position, 0, out);
    } else {
      await animateTo(position, 0, kIndicatorScaleDuration);
    }
    if (mounted.current && mode.current === newMode) {
      dragOffset.current = null;
      setMode(null);
    }
  };

  const show = () => {
    mode.current = 'snap';
    const duration = springAnimationDurationInMilliseconds;
    animateTo(position, 1 / kDragSizeFactorLimit, duration);
    animateTo(showPeak, 1, duration);
    animateTo(indicatorMoveWithPeak, 1, duration);
    animateTo(indicatorTranslateInOut, 1, duration);
    animateTo(ringDisappear, 0, duration);
    animateTo(spring, 0.5, duration, elasticOut).then(() => {
      if (mounted.current && mode.current === 'snap') {
        setMode('refresh');
        progressing.value = withRepeat(
          withTiming(1, { duration: 1000, easing: linear }),
          -1,
          false,
        );
        onRefresh().finally(() => {
          if (mounted.current && mode.current === 'refresh') {
            dismiss('done');
          }
        });
      }
    });
  };

  /** ScrollStartNotification: a pull begins only at the top, and only when nothing is playing. */
  const scrollStart = () => {
    if (scrollY.current <= 0 && mode.current === null && canDrag()) {
      start();
      setMode('drag');
      setSuppressGlow(true);
    }
  };

  /** ScrollEndNotification. */
  const scrollEnd = () => {
    if (mode.current === 'armed') {
      show();
    } else if (mode.current === 'drag') {
      dismiss('canceled');
    }
  };

  const pulling = () => mode.current === 'drag' || mode.current === 'armed';
  const canScroll = () => contentHeight.current - viewport.current > 0;
  /** Whether the list takes a drag at all (shouldAcceptUserOffset). */
  const canDrag = () => alwaysScrollable || canScroll();

  // Android: the finger, alongside the list.
  const pan = usePanGesture({
    enabled: Platform.OS === 'android',
    disableReanimated: true,
    activeOffsetY: [-TOUCH_SLOP, TOUCH_SLOP],
    testID: 'liquid-pull-to-refresh',
    onBegin: () => {
      // The glow decision is made at the first pixel of overscroll, so it is made here, before the
      // list can start one.
      if (scrollY.current <= 0 && mode.current === null && canDrag()) {
        setSuppressGlow(true);
      }
    },
    onActivate: event => {
      lastTranslationY.current = event.translationY;
      scrollStart();
    },
    onUpdate: event => {
      const delta = event.translationY - lastTranslationY.current;
      lastTranslationY.current = event.translationY;
      if (!pulling() || delta === 0) {
        return;
      }
      if (scrollY.current > 0 || (delta < 0 && canScroll())) {
        dismiss('canceled');
        return;
      }
      dragOffset.current = dragOffset.current! + delta / 2;
      checkDragOffset();
    },
    onFinalize: () => {
      scrollEnd();
      if (mode.current === null) {
        setSuppressGlow(false);
      }
    },
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const scrollDelta = y - scrollY.current;
    scrollY.current = y;
    if (pulling()) {
      if (y > 0) {
        dismiss('canceled');
      } else if (Platform.OS === 'ios') {
        dragOffset.current = dragOffset.current! - scrollDelta;
        checkDragOffset();
      }
    }
    if (
      Platform.OS === 'ios' &&
      mode.current === 'armed' &&
      !userDragging.current
    ) {
      show();
    }
    onScroll?.(event);
  };

  const handleScrollBeginDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    userDragging.current = true;
    if (Platform.OS === 'ios') {
      scrollY.current = event.nativeEvent.contentOffset.y;
      scrollStart();
    }
    onScrollBeginDrag?.(event);
  };

  const handleScrollEndDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    userDragging.current = false;
    if (Platform.OS === 'ios') {
      const { contentOffset, velocity } = event.nativeEvent;
      // A bounce back or a fling ends later, in onMomentumScrollEnd.
      const settles = contentOffset.y < 0 || (velocity?.y ?? 0) !== 0;
      if (mode.current === 'armed') {
        show();
      } else if (!settles) {
        scrollEnd();
      }
    }
    onScrollEndDrag?.(event);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (Platform.OS === 'ios') {
      scrollEnd();
    }
    onMomentumScrollEnd?.(event);
  };

  // --- what is drawn ------------------------------------------------------------------------------

  const childStyle = useAnimatedStyle(() => {
    if (hasMode.value === 0) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    const value = clampUnit(position.value);
    if (showChildOpacityTransition) {
      // −0.01 is the package's, for the elasticOut curve.
      return {
        opacity: clampUnit(1 - value - 1 / 3 - 0.01),
        transform: [{ translateY: 0 }],
      };
    }
    return { opacity: 1, transform: [{ translateY: value * height * 1.5 }] };
  });

  // The band: a box of _value × height × 2 (_value runs 0–0.75 with the position), clipped to the
  // hill.
  const bandStyle = useAnimatedStyle(() => ({
    height: clampUnit(position.value) * 0.75 * height * 2,
  }));
  const bandPath = useAnimatedProps(() => {
    const peak = clampUnit(showPeak.value);
    const peakUp = transformInterval(0.1, 0.2, peak, Curves.easeOut);
    const peakDown = 1 - transformInterval(0.2, 0.3, peak, Curves.easeIn);
    return {
      d: curveHillPath(
        width,
        clampUnit(position.value) * 0.75 * height * 2,
        height,
        (height / 2) * (1 - 2 * clampUnit(spring.value)),
        ((height * 3) / 10) * (peakUp !== 1 ? peakUp : peakDown),
        peakUp !== 0 && peakDown !== 0 ? (height * 35) / 100 : 0,
      ),
    };
  });

  const progressFrame = useDerivedValue<CircularProgressFrame>(() => {
    const spin = clampUnit(progressing.value);
    const disappear = clampUnit(ringDisappear.value);
    const opacity = 1 - transformInterval(0, 0.2, disappear, Curves.easeIn);
    const ringScale =
      1 + 0.25 * transformInterval(0, 0.2, disappear, Curves.easeOut);
    const innerScale =
      isDone.value === 1
        ? transformCubic(Curves.easeIn, clampUnit(radius.value))
        : transformInterval(
            0.1,
            0.2,
            clampUnit(indicatorMoveWithPeak.value),
            Curves.easeOut,
          );
    // ProgressRingCurve inside Interval(0, 1): up and back down, but 0 and 1 pass unchanged.
    const ring =
      spin === 0 || spin === 1 ? spin : spin <= 0.5 ? 2 * spin : 2 * (1 - spin);
    return {
      innerCircleRadius: ((height * 15) / 100) * innerScale,
      progressPercent: 0.25 + (5 / 6 - 0.25) * ring,
      progressCircleOpacity: opacity,
      progressCircleRadius: opacity !== 0 ? ((height * 2) / 10) * ringScale : 0,
      startAngle:
        (-2 / 3 + (1 / 2 + 2 / 3) * transformInterval(0.5, 1, spin)) * Math.PI,
    };
  });

  // The indicator: an Align in a box `height` tall, from its bottom (y = 1) to its middle (y = 0),
  // turning by 5π/6 per spin.
  const canvasSize = 2 * (height * 0.25 + borderWidth);
  const indicatorStyle = useAnimatedStyle(() => {
    const frame = progressFrame.value;
    const side =
      2 * Math.max(frame.progressCircleRadius, frame.innerCircleRadius);
    const y =
      1 -
      0.36 *
        transformInterval(
          0.1,
          0.2,
          clampUnit(indicatorMoveWithPeak.value),
          Curves.easeOut,
        ) -
      0.64 *
        transformInterval(
          0.2,
          0.6,
          clampUnit(indicatorTranslateInOut.value),
          Curves.easeOut,
        );
    const centre = ((height - side) * (1 + y)) / 2 + side / 2;
    return {
      transform: [
        { translateY: centre - canvasSize / 2 },
        { rotate: `${clampUnit(progressing.value) * ((5 * Math.PI) / 6)}rad` },
      ],
    };
  });

  return (
    <View
      style={styles.stack}
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.fill, childStyle]}>
          <ScrollView
            {...scrollViewProps}
            simultaneousWith={pan}
            alwaysBounceVertical={
              scrollViewProps.alwaysBounceVertical ?? alwaysScrollable
            }
            overScrollMode={suppressGlow ? 'never' : overScrollMode}
            scrollEventThrottle={scrollViewProps.scrollEventThrottle ?? 16}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onLayout={event => {
              viewport.current = event.nativeEvent.layout.height;
              onLayout?.(event);
            }}
            onContentSizeChange={(contentWidth, contentHeightNow) => {
              contentHeight.current = contentHeightNow;
              onContentSizeChange?.(contentWidth, contentHeightNow);
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
      {showsIndicator && (
        <>
          <Animated.View
            testID="liquid-pull-to-refresh-band"
            style={[styles.band, bandStyle]}
          >
            <Svg width={width} height={height * 2}>
              <AnimatedPath animatedProps={bandPath} fill={color} />
            </Svg>
          </Animated.View>
          <Animated.View
            testID="liquid-pull-to-refresh-indicator"
            pointerEvents="none"
            style={[styles.indicator, { height: canvasSize }, indicatorStyle]}
          >
            <CircularProgress
              frame={progressFrame}
              canvasSize={canvasSize}
              progressCircleBorderWidth={borderWidth}
              backgroundColor={backgroundColor}
            />
          </Animated.View>
        </>
      )}
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const styles = StyleSheet.create({
  // Stack clips to its bounds (Clip.hardEdge), so the child slid down is cut off at the bottom.
  stack: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  band: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
