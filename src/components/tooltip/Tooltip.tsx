// Port of Flutter's Material Tooltip as buttons use it on a phone (material/tooltip.dart,
// widgets/raw_tooltip.dart, painting/geometry.dart positionDependentBox; Flutter 3.41.9):
//
// - Trigger: long press (kLongPressTimeout 500 ms). The long press wins the gesture arena, so the
//   button's tap is cancelled and releasing does not press it. Feedback.forLongPress plays.
// - Look (dark theme): white at 0.9, radius 4, padding 16 × 4, at least 32 tall; text bodyMedium
//   (14, letter-spacing 0.25, ×1.43) in black.
// - Place: the target's centre + 24 below (above only if it fits there and not below), centred
//   horizontally and kept 10 from the screen edges.
// - Motion: fade in 150 ms fastOutSlowIn; fade out 75 ms. After the finger lifts it stays 1.5 s.
// - Tap to dismiss (RawTooltip's global pointer route): while it shows, a touch anywhere but its
//   own button hides it at once. A touch on the button hides it when that touch ends without
//   becoming a long press (onLongPressCancel); a second long press keeps it, without feedback
//   (Feedback plays only when the tooltip was not showing). The touch itself still goes through.
//
// Tooltips draw in one layer (TooltipLayer, in App) over the screens, as Flutter's go in the
// Navigator's Overlay, under the server tag.

import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { forLongPress } from '../../services/feedback';
import { M3, textStyle } from '../../theme/typography';

export const LONG_PRESS_MS = 500;
const SHOW_MS = 150;
const HIDE_MS = 75;
const TOUCH_DELAY_MS = 1500;
const VERTICAL_OFFSET = 24;
const MARGIN = 10;
const fastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);
// Reversing a CurvedAnimation runs the same curve backwards: as a forward easing that is the
// flipped curve.
const fastOutSlowInFlipped = Easing.bezier(0.8, 0.0, 0.6, 1.0);

type Rect = { x: number; y: number; width: number; height: number };
type State = {
  message: string;
  target: Rect;
  visible: boolean;
  key: number;
} | null;

let state: State = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let nextKey = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

function clearHideTimer() {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export function showTooltip(message: string, target: Rect) {
  clearHideTimer();
  state = { message, target, visible: true, key: nextKey++ };
  emit();
}

export function hideTooltip(delayMs = 0) {
  clearHideTimer();
  const hide = () => {
    if (state) {
      state = { ...state, visible: false };
      emit();
    }
  };
  if (delayMs > 0) {
    hideTimer = setTimeout(hide, delayMs);
  } else {
    hide();
  }
}

/** True while a tooltip is shown (or waiting out its 1.5 s), not while it fades away. */
export const isTooltipShowing = () => state !== null && state.visible;
const isShowing = isTooltipShowing;

/** A touch went down at (pageX, pageY): hide the tooltip unless it is on the tooltip's button. */
export function dismissTooltipForTouch(pageX: number, pageY: number) {
  if (!isShowing()) {
    return;
  }
  const { x, y, width, height } = state!.target;
  const onTarget =
    pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height;
  if (!onTarget) {
    hideTooltip();
  }
}

/** Wraps the app: sees every touch first (capture phase) without taking it. */
export function TooltipTouchListener({
  children,
}: {
  children: React.ReactNode;
}) {
  const onCapture = (event: GestureResponderEvent) => {
    dismissTooltipForTouch(event.nativeEvent.pageX, event.nativeEvent.pageY);
    return false;
  };
  return (
    <View
      testID="tooltip-touch-listener"
      style={styles.fill}
      onStartShouldSetResponderCapture={onCapture}
    >
      {children}
    </View>
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** painting/geometry.dart positionDependentBox with the Tooltip defaults. */
export function tooltipPosition(
  screen: { width: number; height: number },
  size: { width: number; height: number },
  target: Rect,
): { x: number; y: number } {
  const cx = target.x + target.width / 2;
  const cy = target.y + target.height / 2;
  const fitsBelow =
    cy + VERTICAL_OFFSET + size.height <= screen.height - MARGIN;
  const fitsAbove = cy - VERTICAL_OFFSET - size.height >= MARGIN;
  const below = fitsAbove === fitsBelow ? true : fitsBelow;
  const y = below
    ? Math.min(cy + VERTICAL_OFFSET, screen.height - MARGIN)
    : Math.max(cy - VERTICAL_OFFSET - size.height, MARGIN);
  const flexibleSpace = screen.width - size.width;
  const x =
    flexibleSpace <= 2 * MARGIN
      ? flexibleSpace / 2
      : Math.min(Math.max(cx - size.width / 2, MARGIN), flexibleSpace - MARGIN);
  return { x, y };
}

/**
 * Wires a button to a tooltip: measure the returned ref's view, pass the handlers to its InkWell
 * (onLongPress, onPressOut, delayLongPress).
 */
export function useTooltip(message: string | undefined) {
  const targetRef = useRef<React.ComponentRef<typeof View>>(null);
  const shownByThisPress = useRef(false);
  if (message === undefined) {
    return { targetRef, handlers: {} };
  }
  return {
    targetRef,
    handlers: {
      delayLongPress: LONG_PRESS_MS,
      onLongPress: () => {
        if (!isShowing()) {
          forLongPress();
        }
        shownByThisPress.current = true;
        targetRef.current?.measureInWindow((x, y, width, height) =>
          showTooltip(message, { x, y, width, height }),
        );
      },
      onPressOut: () => {
        if (shownByThisPress.current) {
          shownByThisPress.current = false;
          hideTooltip(TOUCH_DELAY_MS);
        } else if (isShowing()) {
          hideTooltip();
        }
      },
    },
  };
}

export function TooltipLayer() {
  const current = useSyncExternalStore(subscribe, () => state);
  const screen = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const key = current?.key;
  const visible = current?.visible ?? false;

  useEffect(() => {
    setSize(null);
  }, [key]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? SHOW_MS : HIDE_MS,
      easing: visible ? fastOutSlowIn : fastOutSlowInFlipped,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible && state && !state.visible) {
        state = null;
        emit();
      }
    });
  }, [key, visible, opacity]);

  if (current === null) {
    return null;
  }
  const position =
    size === null ? null : tooltipPosition(screen, size, current.target);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        key={current.key}
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          setSize(prev =>
            prev && prev.width === width && prev.height === height
              ? prev
              : { width, height },
          );
        }}
        style={[
          styles.tooltip,
          position === null
            ? styles.measuring
            : { left: position.x, top: position.y },
          position === null ? styles.hidden : { opacity },
        ]}
      >
        <Text style={labelStyle}>{current.message}</Text>
      </Animated.View>
    </View>
  );
}

const labelStyle = textStyle(M3.bodyMedium, { color: '#000000', fontSize: 14 });

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    minHeight: 32,
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  fill: { flex: 1 },
  measuring: { left: 0, top: 0 },
  hidden: { opacity: 0 },
});
