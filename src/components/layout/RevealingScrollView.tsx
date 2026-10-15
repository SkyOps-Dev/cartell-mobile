// A ScrollView that keeps the focused text field's caret line on screen, as Flutter's EditableText
// does in its enclosing Scrollable (editable_text.dart _scheduleShowCaretOnScreen, 3.41.9):
//
// - The rectangle revealed is the caret line inflated by TextField.scrollPadding (20 all round),
//   except below: on Android the collapsed selection handle needs more, max(handle centre 15 +
//   48 / 2, 20) = 39. Android's caret spans the line; iOS's is 2 taller, centred on it.
// - The scroll is the smallest one that shows that rectangle (RenderViewport.showOnScreen).
// - When the field gains focus: animated, 100 ms fastOutSlowIn.
// - On every frame the keyboard inset grows (didChangeMetrics): a jump, no animation.
//
// Both run on the UI thread (Reanimated), measuring the field, the content and the viewport as
// laid out in that frame. Fields find this view through ScrollRevealContext (OutlinedTextField
// calls it on focus).

import React, { createContext, useCallback, useState } from 'react';
import { Platform, ScrollViewProps, StyleSheet } from 'react-native';
import Animated, {
  AnimatedRef,
  Easing,
  measure,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useScrollViewOffset,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { useViewInsets } from './viewInsets';

export type RevealRequest = {
  // Any host component; Reanimated measures it on the UI thread.
  input: AnimatedRef<never>;
  /** The field's line height (bodyLarge: 16 × 1.5 = 24). */
  lineHeight: number;
};

export const ScrollRevealContext = createContext<
  ((request: RevealRequest) => void) | null
>(null);

const SCROLL_PADDING = 20;
const CARET_ANIMATION_MS = 100;
const OS = Platform.OS;

/**
 * The scroll offset that shows a field's caret line with its padding, moving as little as possible
 * and staying within the scroll range. `fieldY` is the field's top in content coordinates.
 */
export function offsetToReveal({
  fieldY,
  fieldHeight,
  lineHeight,
  offset,
  viewportHeight,
  contentHeight,
  os,
}: {
  fieldY: number;
  fieldHeight: number;
  lineHeight: number;
  offset: number;
  viewportHeight: number;
  contentHeight: number;
  os: string;
}): number {
  'worklet';
  const caretOverhang = os === 'ios' ? 1 : 0;
  const bottomSpacing = os === 'android' ? 39 : SCROLL_PADDING;
  const lineTop = fieldY + (fieldHeight - lineHeight) / 2;
  const top = lineTop - caretOverhang - SCROLL_PADDING;
  const bottom = lineTop + lineHeight + caretOverhang + bottomSpacing;
  let target = offset;
  if (bottom > offset + viewportHeight) {
    target = bottom - viewportHeight;
  }
  if (top < target) {
    target = top;
  }
  const maxOffset = Math.max(0, contentHeight - viewportHeight);
  return Math.min(Math.max(target, 0), maxOffset);
}

export function RevealingScrollView({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const contentRef = useAnimatedRef<Animated.View>();
  const offset = useScrollViewOffset(scrollRef);
  const noKeyboard = useSharedValue(0);
  const keyboard = useViewInsets()?.bottom ?? noKeyboard;
  const [focused, setFocused] = useState<RevealRequest | null>(null);
  const caretOffset = useSharedValue(0);
  const caretAnimating = useSharedValue(false);

  const targetFor = useCallback(
    (request: RevealRequest): number | null => {
      'worklet';
      const field = measure(request.input);
      const viewport = measure(scrollRef);
      const content = measure(contentRef);
      if (field === null || viewport === null || content === null) {
        return null;
      }
      return offsetToReveal({
        fieldY: field.pageY - content.pageY,
        fieldHeight: field.height,
        lineHeight: request.lineHeight,
        offset: offset.value,
        viewportHeight: viewport.height,
        contentHeight: content.height,
        os: OS,
      });
    },
    [contentRef, offset, scrollRef],
  );

  // didChangeMetrics: jump on every frame the inset grows, then once more on the next frame, after
  // that frame's layout has landed (Flutter reveals in a post-frame callback).
  useAnimatedReaction(
    () => keyboard.value,
    (current, previous) => {
      if (focused === null || previous === null || current <= previous) {
        return;
      }
      const jump = () => {
        const target = targetFor(focused);
        if (target !== null && target !== offset.value) {
          caretAnimating.value = false;
          scrollTo(scrollRef, 0, target, false);
        }
      };
      jump();
      requestAnimationFrame(jump);
    },
    [focused, targetFor],
  );

  useAnimatedReaction(
    () => caretOffset.value,
    value => {
      if (caretAnimating.value) {
        scrollTo(scrollRef, 0, value, false);
      }
    },
  );

  const revealOnFocus = useCallback(
    (request: RevealRequest) => {
      setFocused(request);
      scheduleOnUI(() => {
        'worklet';
        const target = targetFor(request);
        if (target === null || target === offset.value) {
          return;
        }
        caretOffset.value = offset.value;
        caretAnimating.value = true;
        caretOffset.value = withTiming(
          target,
          {
            duration: CARET_ANIMATION_MS,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1.0),
          },
          () => {
            caretAnimating.value = false;
          },
        );
      });
    },
    [caretAnimating, caretOffset, offset, targetFor],
  );

  return (
    <Animated.ScrollView
      ref={scrollRef}
      {...props}
      contentContainerStyle={styles.grow}
    >
      {/* Measured against, so it carries the caller's content style and fills the content. */}
      <Animated.View
        ref={contentRef}
        collapsable={false}
        style={[styles.grow, contentContainerStyle]}
      >
        <ScrollRevealContext.Provider value={revealOnFocus}>
          {children}
        </ScrollRevealContext.Provider>
      </Animated.View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({ grow: { flexGrow: 1 } });
