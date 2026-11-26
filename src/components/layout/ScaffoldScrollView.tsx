// A vertical scroll view in a Scaffold's body or drawer, whose scrolling the app bar watches
// (scrolledUnder.ts): Flutter's SingleChildScrollView or ListView at the top of a screen. Apart
// from that, React Native's ScrollView, prop for prop. Use a plain ScrollView for a horizontal
// one, which never changes the app bar.

import React from 'react';
import type { ScrollViewProps } from 'react-native';
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { useScrolledUnderReaction } from './scrolledUnder';

export function ScaffoldScrollView(props: ScrollViewProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  useScrolledUnderReaction(useScrollViewOffset(scrollRef));
  return <Animated.ScrollView ref={scrollRef} {...props} />;
}
