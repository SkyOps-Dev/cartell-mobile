// Port of Flutter's SafeArea: padding by MediaQuery.padding. Flutter lowers the bottom padding
// while the keyboard is open, max(0, viewPadding.bottom − viewInsets.bottom), in the same frame as
// the Scaffold body shrinks.
//
// react-native-safe-area-context's SafeAreaView measures its own frame natively and corrects its
// padding in a second layout pass. On the auth screens that left the navigation-bar padding in
// place for the moment the focused field was revealed, so the form scrolled 44 dp (the bar's
// height) too far (measured against the Flutter app, 2026-10-13). Here the padding follows the
// same per-frame inset as the Scaffold.
//
// Under a Scaffold's app bar the top padding is already spent (Scaffold wraps its body in
// MediaQuery.removePadding(removeTop: true)), so it is 0 there.

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useViewInsets } from './viewInsets';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Flutter's MediaQuery.padding.bottom with the keyboard open. */
export function safeBottomPadding(
  viewPaddingBottom: number,
  viewInsetBottom: number,
): number {
  'worklet';
  return Math.max(0, viewPaddingBottom - viewInsetBottom);
}

/** True inside a Scaffold body that sits below an app bar. */
export const TopPaddingConsumedContext = React.createContext(false);

export function SafeArea({ children, style }: Props) {
  const insets = useSafeAreaInsets();
  const topConsumed = React.useContext(TopPaddingConsumedContext);
  const noKeyboard = useSharedValue(0);
  const keyboard = useViewInsets()?.bottom ?? noKeyboard;
  const viewPaddingBottom = insets.bottom;
  const bottomStyle = useAnimatedStyle(() => ({
    paddingBottom: safeBottomPadding(viewPaddingBottom, keyboard.value),
  }));
  return (
    <Animated.View
      style={[
        style,
        {
          paddingTop: topConsumed ? 0 : insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        bottomStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}
