// Flutter's MediaQuery.viewInsets.bottom: how much of the bottom of the screen the keyboard covers,
// updated on every frame while the keyboard slides, as Flutter's engine does (it listens to
// Android's WindowInsetsAnimation and re-lays out the UI each frame).
//
// React Native's own Keyboard module reports the keyboard once, when it has opened, so the screen
// jumped (PARITY_ISSUES P8). react-native-keyboard-controller listens to the same per-frame
// insets; Reanimated applies them to layout on the UI thread in the same frame. With both bars
// declared translucent on the provider (App.tsx), `height` is the full inset, navigation bar
// included, which is exactly Flutter's value.
//
// The Scaffold owns one source per screen and shares it through ViewInsetsContext.

import { createContext, useContext, useState } from 'react';
import {
  KeyboardController,
  useKeyboardHandler,
} from 'react-native-keyboard-controller';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export type ViewInsets = {
  /** viewInsets.bottom, frame by frame (UI thread). */
  bottom: SharedValue<number>;
  /** `viewInsets.bottom > 0`, for code that rebuilds on it (Login hides its logo). */
  keyboardShown: boolean;
};

export const ViewInsetsContext = createContext<ViewInsets | null>(null);

function initialInset(): number {
  return KeyboardController.isVisible() ? KeyboardController.state().height : 0;
}

/** Owned by Scaffold: follows the keyboard frame by frame. */
export function useViewInsetsSource(): ViewInsets {
  const bottom = useSharedValue(initialInset());
  const [keyboardShown, setKeyboardShown] = useState(() => initialInset() > 0);

  useKeyboardHandler(
    {
      onMove: event => {
        'worklet';
        const wasShown = bottom.value > 0;
        bottom.value = event.height;
        if (event.height > 0 !== wasShown) {
          scheduleOnRN(setKeyboardShown, event.height > 0);
        }
      },
      onInteractive: event => {
        'worklet';
        bottom.value = event.height;
      },
      onEnd: event => {
        'worklet';
        bottom.value = event.height;
        scheduleOnRN(setKeyboardShown, event.height > 0);
      },
    },
    [],
  );

  return { bottom, keyboardShown };
}

/** The enclosing Scaffold's insets, or none outside one. */
export function useViewInsets(): ViewInsets | null {
  return useContext(ViewInsetsContext);
}
