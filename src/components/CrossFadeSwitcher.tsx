// Port of Flutter's AnimatedSwitcher with its defaults, as the routers use it
// (duration and reverseDuration 300 ms; spec 06 §6):
// - When the child's identity (its `screenKey`) changes, the new child fades in from 0 over
//   300 ms, linear, over the black ground (App.tsx). The old child is not seen at all: measured
//   on the Flutter app (RMX5070, 2026-10-13, Login → Welcome), 50 ms after the tap the old screen
//   is already gone and the new one is part-way in from black. AnimatedSwitcher's source reads as
//   a cross-fade; the cause is not identified, the measurement wins (quirk Q49). The old child
//   stays mounted, invisible, until the fade ends, so unmounting it never lands mid-fade.
// - FadeTransition fades the screen as one composited layer. React Native fades every view on its
//   own, so mid-fade a dark label blends into its half-transparent button and pops back at the
//   end (measured: labels missing 50 ms in). The fading screen is therefore composited offscreen,
//   in a GPU texture, while it fades.
// - When only the props change (same screenKey), the child updates in place, keeping its state,
//   with no transition.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const DURATION_MS = 300;

type Layer = {
  id: number;
  screenKey: string;
  element: React.ReactElement;
  opacity: Animated.Value;
  leaving: boolean;
  fading: boolean;
};

export function CrossFadeSwitcher({
  screenKey,
  children,
}: {
  screenKey: string;
  children: React.ReactElement;
}) {
  const nextId = useRef(1);
  const [layers, setLayers] = useState<Layer[]>(() => [
    {
      id: 0,
      screenKey,
      element: children,
      opacity: new Animated.Value(1),
      leaving: false,
      fading: false,
    },
  ]);

  useEffect(() => {
    setLayers(current => {
      const top = current[current.length - 1];
      if (top && top.screenKey === screenKey && !top.leaving) {
        // Same screen type: update in place.
        return [...current.slice(0, -1), { ...top, element: children }];
      }
      const outgoing = current.map(layer => {
        if (!layer.leaving) {
          layer.opacity.stopAnimation();
          layer.opacity.setValue(0);
        }
        return { ...layer, leaving: true };
      });
      const incoming: Layer = {
        id: nextId.current++,
        screenKey,
        element: children,
        opacity: new Animated.Value(0),
        leaving: false,
        fading: true,
      };
      Animated.timing(incoming.opacity, {
        toValue: 1,
        duration: DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setLayers(now =>
            now
              .filter(l => !l.leaving)
              .map(l => (l.id === incoming.id ? { ...l, fading: false } : l)),
          );
        }
      });
      return [...outgoing, incoming];
    });
  }, [screenKey, children]);

  return (
    <View style={styles.stack}>
      {layers.map(layer => (
        <Animated.View
          key={layer.id}
          pointerEvents={layer.leaving ? 'none' : 'auto'}
          needsOffscreenAlphaCompositing={layer.fading}
          renderToHardwareTextureAndroid={layer.fading}
          style={[StyleSheet.absoluteFill, { opacity: layer.opacity }]}
        >
          {layer.element}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1 },
});
