// Port of Flutter's InkWell press feedback (ink_well.dart, ink_highlight.dart, ink_ripple.dart;
// spec 07 §3.1):
// - Highlight: fades in over 200 ms while pressed, fades out over 200 ms on release.
// - Ripple (InkRipple): starts at the touch point, fades in over 75 ms, grows from 30% of the
//   target radius (half the box diagonal) to the target + 5 with Curves.ease while drifting to the
//   box centre. Unconfirmed it takes 1 s; on release it finishes within 225 ms and fades out over
//   the last 150 ms of a 375 ms window.
// - Splash on Android: Material 3's InkSparkle, drawn by InkSparkleWave (its soft wave; the
//   sparkles are left out, PARITY_ISSUES P3). Android's native RippleDrawable, which InkSparkle
//   was modelled on, is far stronger on screen, so it is not used. iOS uses the InkRipple above,
//   as Flutter does there.
// - Both are clipped to the ink shape (`borderRadius`), not to whatever surface is behind.
// - A long press (when the caller handles one, e.g. a tooltip) cancels the tap, as in Flutter's
//   gesture arena: the highlight fades out over 200 ms, the ripple over 75 ms (InkRipple.cancel),
//   and releasing does not press.
// - The press is taken by the InkWell itself, never by a child, so the touch point is measured
//   from the InkWell (otherwise a tap on the icon started the ripple at the icon's corner).

import React, { useRef, useState } from 'react';

import { InkSparkleWave, SparkleSpec, startSparkle } from './InkSparkleWave';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const HIGHLIGHT_FADE_MS = 200;
const FADE_IN_MS = 75;
const UNCONFIRMED_MS = 1000;
const RADIUS_MS = 225;
const FADE_OUT_MS = 375;
const FADE_OUT_INTERVAL_START = 225 / 375;
const CANCEL_MS = 75;
const PRESS_TIMEOUT_MS = 100;
const sparkleSplash = Platform.OS === 'android';

// Curves.ease = Cubic(0.25, 0.1, 0.25, 1.0)
const ease = Easing.bezier(0.25, 0.1, 0.25, 1.0);

type Ripple = {
  key: number;
  x: number;
  y: number;
  radius: number;
  progress: Animated.Value; // 0 → 1 drives radius and drift
  opacity: Animated.Value;
};

export type InkWellProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Corner radius of the ink shape. Use a large number for a stadium. */
  borderRadius?: number;
  highlightColor: string;
  splashColor: string;
};

export function InkWell({
  style,
  children,
  borderRadius = 0,
  highlightColor,
  splashColor,
  disabled,
  onPressIn,
  onPressOut,
  onLongPress,
  ...pressableProps
}: InkWellProps) {
  const size = useRef({ width: 0, height: 0 });
  const highlight = useRef(new Animated.Value(0)).current;
  const nextKey = useRef(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [sparkles, setSparkles] = useState<SparkleSpec[]>([]);
  const active = useRef<Ripple | null>(null);
  // Where the finger went down. With the press delay, the event handed to onPressIn no longer
  // carries the touch position, so it is taken when the touch starts.
  const touchPoint = useRef({ x: 0, y: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    size.current = { width, height };
    pressableProps.onLayout?.(event);
  };

  const fadeHighlightOut = () =>
    Animated.timing(highlight, {
      toValue: 0,
      duration: HIGHLIGHT_FADE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

  const handlePressIn = (event: GestureResponderEvent) => {
    Animated.timing(highlight, {
      toValue: 1,
      duration: HIGHLIGHT_FADE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    if (sparkleSplash) {
      const key = nextKey.current++;
      const sparkle = startSparkle(
        {
          ...touchPoint.current,
          width: size.current.width,
          height: size.current.height,
        },
        key,
        () => setSparkles(current => current.filter(s => s.key !== key)),
      );
      setSparkles(current => [...current, sparkle]);
      onPressIn?.(event);
      return;
    }
    const { width, height } = size.current;
    const ripple: Ripple = {
      key: nextKey.current++,
      ...touchPoint.current,
      radius: Math.sqrt(width * width + height * height) / 2,
      progress: new Animated.Value(0),
      opacity: new Animated.Value(0),
    };
    active.current = ripple;
    setRipples(current => [...current, ripple]);

    Animated.timing(ripple.opacity, {
      toValue: 1,
      duration: FADE_IN_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    Animated.timing(ripple.progress, {
      toValue: 1,
      duration: UNCONFIRMED_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    onPressIn?.(event);
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    fadeHighlightOut();
    const ripple = active.current;
    active.current = null;
    if (ripple) {
      ripple.progress.stopAnimation();
      ripple.opacity.stopAnimation(() =>
        Animated.timing(ripple.opacity, {
          toValue: 0,
          duration: CANCEL_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() =>
          setRipples(current => current.filter(r => r.key !== ripple.key)),
        ),
      );
    }
    onLongPress?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    fadeHighlightOut();

    const ripple = active.current;
    active.current = null;
    if (ripple) {
      ripple.progress.stopAnimation(value => {
        Animated.parallel([
          Animated.timing(ripple.progress, {
            toValue: 1,
            duration: (1 - value) * RADIUS_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(FADE_OUT_MS * FADE_OUT_INTERVAL_START),
            Animated.timing(ripple.opacity, {
              toValue: 0,
              duration: FADE_OUT_MS * (1 - FADE_OUT_INTERVAL_START),
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setRipples(current => current.filter(r => r.key !== ripple.key));
        });
      });
    }
    onPressOut?.(event);
  };

  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      onLayout={onLayout}
      onTouchStart={event => {
        touchPoint.current = {
          x: event.nativeEvent.locationX,
          y: event.nativeEvent.locationY,
        };
        pressableProps.onTouchStart?.(event);
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      // Flutter's tap recognizer reports the press only after kPressTimeout (100 ms), or at
      // release if that comes first, so a quick tap shows almost no highlight.
      unstable_pressDelay={PRESS_TIMEOUT_MS}
      pointerEvents="box-only"
      style={style}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.clip, { borderRadius }]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: highlightColor, opacity: highlight },
          ]}
        />
        {sparkles.map(sparkle => (
          <InkSparkleWave
            key={sparkle.key}
            spec={sparkle}
            color={splashColor}
          />
        ))}
        {ripples.map(ripple => {
          const { width, height } = size.current;
          const start = ripple.radius * 0.3;
          const end = ripple.radius + 5;
          const eased = ripple.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
            easing: ease,
          });
          return (
            <Animated.View
              key={ripple.key}
              style={[
                styles.ripple,
                {
                  width: end * 2,
                  height: end * 2,
                  borderRadius: end,
                  left: -end,
                  top: -end,
                  backgroundColor: splashColor,
                  opacity: ripple.opacity,
                  transform: [
                    {
                      translateX: eased.interpolate({
                        inputRange: [0, 1],
                        outputRange: [ripple.x, width / 2],
                      }),
                    },
                    {
                      translateY: eased.interpolate({
                        inputRange: [0, 1],
                        outputRange: [ripple.y, height / 2],
                      }),
                    },
                    {
                      scale: eased.interpolate({
                        inputRange: [0, 1],
                        outputRange: [start / end, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  ripple: { position: 'absolute' },
});
