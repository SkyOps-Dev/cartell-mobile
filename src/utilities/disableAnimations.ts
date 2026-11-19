// MediaQuery.disableAnimationsOf(context): the OS asks for no animations. Flutter's engine reads
// Android's TRANSITION_ANIMATION_SCALE (0 = "Remove animations") and iOS's Reduce Motion, and
// follows changes while the app runs; React Native's AccessibilityInfo reads the same two.
// Until the first answer arrives (a native round trip) animations are assumed on.

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useDisableAnimations(): boolean {
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      value => {
        if (active) setDisabled(value);
      },
      () => {},
    );
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setDisabled,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return disabled;
}
