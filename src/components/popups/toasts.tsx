// Port of showToastPopup, showSuccessfulToastPopup and showFailedToastPopup
// (frontend/lib/components/popups.dart; spec 07 §5) and the parts of toastification 2.3.0 they use:
// `toastification.dismissAll()` then `toastification.show(...)` with type info, style flat, the
// icon in white, the message in white as the description, alignment topCenter, margin top 50, no
// progress bar, auto close after 5 s, a fade, drag to close.
//
// Look (flat style, FlatToastWidget):
// - A box as wide as the overlay allows (itemWidth 400, so the whole width on a phone), min
//   height 64, radius 12, border #EBEBEB 1.5, filled with the toast's colour, padding
//   20/16/12/16 inside the border.
// - Row: the icon (24) and 12, the message (14, w300, letter-spacing 0.1, height 1.2, white; at
//   most 2 lines, the rest clipped), 8, then a 30 × 30 close button (Icons.close 18, in the
//   toast's colour at 0.3 opacity, so on the app's grey toasts it is all but invisible).
// Placement: top centre, 12 + the status bar from the top, then the toast's own 50 margin. Toasts
// sit in the root overlay, above dialogs. A newer toast is inserted above the older ones.
// Motion (AnimatedList + the fade the app passes), 600 ms each way:
// - the item's height opens over the first 60 % (Interval(0, 0.6, easeInOut)), its content kept
//   vertically centred in it (Align(-1, 0)), so it drops into place;
// - it fades in over 30 %–100 % (Interval(0.3, 1, easeInOut)). Closing runs the same backwards.
// - The first toast waits 100 ms for the overlay to be made; later ones 10 ms. The overlay goes
//   650 ms after the last toast closes. dismissAll closes the open toasts oldest first, 150 ms
//   apart, without waiting.
// - The 5 s timer starts when the toast is made and pauses while a finger is down on it.
// - Dragging it sideways moves it with the finger and fades it (Dismissible). Past 40 % of its
//   width, or flung (700 px/s, and 400 more across than down), it slides out over 200 ms, closes
//   up over 300 ms (Interval(0.4, 1, ease)) and is gone, with no closing animation. Otherwise it
//   slides back over 200 ms.
// Tapping the toast does nothing (closeOnClick off) but does not reach the screen below. The close
// button closes it, animated.

import React, { useMemo, useSyncExternalStore } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  kCartellDarkGray,
  kInkHighlightColor,
  kInkSplashColor,
  MaterialColors,
  withOpacity,
} from '../../theme/colors';
import { clampUnit, Curves, transformCubic } from '../../theme/curves';
import { Icon } from '../icons/Icon';
import { FontAwesomeIcons, IconData, Icons } from '../icons/iconData';
import { InkWell } from '../ink/InkWell';

const ANIMATION_MS = 600;
const CREATE_OVERLAY_DELAY_MS = 100;
const INSERT_DELAY_MS = 10;
const REMOVE_OVERLAY_DELAY_MS = 50;
const DISMISS_ALL_GAP_MS = 150;
const AUTO_CLOSE_MS = 5000;
const ITEM_WIDTH = 400;
const OVERLAY_TOP_MARGIN = 12;
const TOAST_TOP_MARGIN = 50;
const DESCRIPTION_LINE = 14 * 1.2;
// Dismissible.
const MOVEMENT_MS = 200;
const RESIZE_MS = 300;
const DISMISS_THRESHOLD = 0.4;
const MIN_FLING_VELOCITY = 700;
const MIN_FLING_VELOCITY_DELTA = 400;
const TOUCH_SLOP = 18;
// Curves.ease.
const EASE = [0.25, 0.1, 0.25, 1.0] as const;

/** PausableTimer: counts down only while started. */
class PausableTimer {
  private remaining: number;
  private startedAt: number | null = null;
  private handle: ReturnType<typeof setTimeout> | null = null;

  constructor(durationMs: number, private readonly onFire: () => void) {
    this.remaining = durationMs;
  }

  start() {
    if (this.handle !== null || this.remaining <= 0) {
      return;
    }
    this.startedAt = Date.now();
    this.handle = setTimeout(() => {
      this.handle = null;
      this.remaining = 0;
      this.onFire();
    }, this.remaining);
  }

  pause() {
    if (this.handle === null || this.startedAt === null) {
      return;
    }
    clearTimeout(this.handle);
    this.handle = null;
    this.remaining -= Date.now() - this.startedAt;
  }

  cancel() {
    if (this.handle !== null) {
      clearTimeout(this.handle);
      this.handle = null;
    }
    this.remaining = 0;
  }
}

type ToastEntry = {
  id: number;
  message: string;
  color: string;
  icon: IconData;
  /** The AnimatedList item animation: 0 → 1 in, 1 → 0 out. */
  progress: SharedValue<number>;
  timer: PausableTimer;
};

// --- store -------------------------------------------------------------------------------

/** Shown toasts, newest first (ToastificationManager._notifications). */
let shown: ToastEntry[] = [];
/** What the overlay draws: the shown toasts plus those still animating out, newest first. */
let drawn: ToastEntry[] = [];
let overlayExists = false;
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => drawn;

const timing = (to: number) =>
  withTiming(to, { duration: ANIMATION_MS, easing: Easing.linear });

function removeFromOverlay(entry: ToastEntry) {
  drawn = drawn.filter(e => e !== entry);
  emit();
}

/** ToastificationManager.dismiss. */
function dismiss(entry: ToastEntry, { showRemoveAnimation = true } = {}) {
  if (!shown.includes(entry)) {
    return;
  }
  entry.timer.cancel();
  shown = shown.filter(e => e !== entry);
  if (showRemoveAnimation) {
    entry.progress.value = timing(0);
    setTimeout(() => removeFromOverlay(entry), ANIMATION_MS);
  } else {
    removeFromOverlay(entry);
  }
  if (shown.length === 0) {
    setTimeout(() => {
      if (shown.length === 0) {
        overlayExists = false;
      }
    }, ANIMATION_MS + REMOVE_OVERLAY_DELAY_MS);
  }
}

/** toastification.dismissAll(): oldest first, 150 ms apart; nobody waits for it. */
async function dismissAll() {
  for (const entry of [...shown].reverse()) {
    if (shown.includes(entry)) {
      dismiss(entry);
      await new Promise(resolve => setTimeout(resolve, DISMISS_ALL_GAP_MS));
    }
  }
}

/** showToastPopup(context, message, color, icon, shouldDismiss); `shouldDismiss` is unused. */
export function showToastPopup(
  message: string,
  color: string,
  icon: IconData,
  _shouldDismiss: boolean,
): void {
  dismissAll();
  const entry: ToastEntry = {
    id: nextId++,
    message,
    color,
    icon,
    progress: makeMutable(0),
    timer: new PausableTimer(AUTO_CLOSE_MS, () => dismiss(entry)),
  };
  // The timer runs from now, before the toast is even on screen.
  entry.timer.start();
  const delay = overlayExists ? INSERT_DELAY_MS : CREATE_OVERLAY_DELAY_MS;
  overlayExists = true;
  setTimeout(() => {
    shown = [entry, ...shown];
    drawn = [entry, ...drawn];
    emit();
    entry.progress.value = timing(1);
  }, delay);
}

export function showSuccessfulToastPopup(
  message: string,
  { shouldDismiss = true } = {},
): void {
  showToastPopup(
    message,
    kCartellDarkGray,
    FontAwesomeIcons.circleCheck,
    shouldDismiss,
  );
}

export function showFailedToastPopup(
  message: string,
  { shouldDismiss = true } = {},
): void {
  showToastPopup(message, kCartellDarkGray, Icons.error_outline, shouldDismiss);
}

/** Tests only: forget every toast at once. */
export function resetToastsForTests(): void {
  shown.forEach(entry => entry.timer.cancel());
  shown = [];
  drawn = [];
  overlayExists = false;
  emit();
}

// --- host --------------------------------------------------------------------------------

/** Draws the toasts above `children` (the root overlay). Mount once, outside the PopupHost. */
export function ToastHost({ children }: { children: React.ReactNode }) {
  const toasts = useSyncExternalStore(subscribe, snapshot);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Container(margin: 12 top + viewPadding, tight width 400) inside Align(topCenter).
  const available = width - insets.left - insets.right;
  return (
    <View style={styles.root}>
      {children}
      {toasts.length > 0 && (
        <View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            {
              paddingTop: OVERLAY_TOP_MARGIN + insets.top,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          <View style={{ width: Math.min(ITEM_WIDTH, available) }}>
            {toasts.map(entry => (
              <ToastItem key={entry.id} entry={entry} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const descriptionStyle = {
  fontSize: 14,
  fontWeight: '300' as const,
  letterSpacing: 0.1,
  lineHeight: DESCRIPTION_LINE,
  color: MaterialColors.white,
  includeFontPadding: false,
};

function ToastItem({ entry }: { entry: ToastEntry }) {
  const fullHeight = useSharedValue(0);
  const dragX = useSharedValue(0);
  const itemWidth = useSharedValue(0);
  // Dismissible's resize controller after the slide-out: 0 → 1.
  const resize = useSharedValue(0);

  const outerStyle = useAnimatedStyle(() => {
    const t = clampUnit(entry.progress.value);
    const slideIn = transformCubic(Curves.easeInOut, Math.min(1, t / 0.6));
    // _kResizeTimeCurve: Interval(0.4, 1.0, Curves.ease), driving the size from 1 to 0.
    const r = clampUnit(resize.value);
    const resized = r <= 0.4 ? 1 : 1 - transformCubic(EASE, (r - 0.4) / 0.6);
    return { height: fullHeight.value * slideIn * resized };
  });
  const innerStyle = useAnimatedStyle(() => {
    const t = clampUnit(entry.progress.value);
    const slideIn = transformCubic(Curves.easeInOut, Math.min(1, t / 0.6));
    const fade = transformCubic(
      Curves.easeInOut,
      Math.min(1, Math.max(0, (t - 0.3) / 0.7)),
    );
    const dragProgress =
      itemWidth.value > 0
        ? Math.min(1, Math.abs(dragX.value) / itemWidth.value)
        : 0;
    const height = fullHeight.value;
    return {
      opacity: fade * (1 - dragProgress),
      // Align(-1, 0) with heightFactor: the content stays centred in the opening box.
      transform: [
        { translateY: (height * slideIn - height) / 2 },
        { translateX: dragX.value },
      ],
    };
  });

  const responder = useMemo(() => {
    let dragging = false;
    const settle = (to: number) => {
      dragX.value = withTiming(to, {
        duration: MOVEMENT_MS,
        easing: Easing.linear,
      });
    };
    const dismissBySwipe = (direction: number) => {
      settle(direction * itemWidth.value);
      setTimeout(() => {
        resize.value = withTiming(1, {
          duration: RESIZE_MS,
          easing: Easing.linear,
        });
        setTimeout(
          () => dismiss(entry, { showRemoveAnimation: false }),
          RESIZE_MS,
        );
      }, MOVEMENT_MS);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => !dragging,
      onPanResponderGrant: () => {
        dragging = false;
        entry.timer.pause();
      },
      onPanResponderMove: (_event, gesture) => {
        if (!dragging) {
          if (Math.abs(gesture.dx) <= TOUCH_SLOP) {
            return;
          }
          dragging = true;
        }
        const offset = gesture.dx - Math.sign(gesture.dx) * TOUCH_SLOP;
        dragX.value = offset;
      },
      onPanResponderRelease: (_event, gesture) => {
        entry.timer.start();
        if (!dragging) {
          return;
        }
        dragging = false;
        const vx = gesture.vx * 1000;
        const vy = gesture.vy * 1000;
        const extent = dragX.value;
        const isFling =
          Math.abs(vx) - Math.abs(vy) >= MIN_FLING_VELOCITY_DELTA &&
          Math.abs(vx) >= MIN_FLING_VELOCITY;
        if (isFling && (extent === 0 || Math.sign(vx) === Math.sign(extent))) {
          dismissBySwipe(Math.sign(vx));
        } else if (
          !isFling &&
          itemWidth.value > 0 &&
          Math.abs(extent) / itemWidth.value > DISMISS_THRESHOLD
        ) {
          dismissBySwipe(Math.sign(extent));
        } else {
          settle(0);
        }
      },
      onPanResponderTerminate: () => {
        entry.timer.start();
        dragging = false;
        settle(0);
      },
    });
  }, [dragX, entry, itemWidth, resize]);

  return (
    <Animated.View style={[styles.item, outerStyle]}>
      <Animated.View
        style={[styles.itemContent, innerStyle]}
        onLayout={event => {
          fullHeight.value = event.nativeEvent.layout.height;
          itemWidth.value = event.nativeEvent.layout.width;
        }}
        {...responder.panHandlers}
      >
        <View style={[styles.box, { backgroundColor: entry.color }]}>
          <View style={styles.iconSlot}>
            <Icon icon={entry.icon} size={24} color={MaterialColors.white} />
          </View>
          <View style={styles.content}>
            <View style={styles.description}>
              <Text style={descriptionStyle}>{entry.message}</Text>
            </View>
          </View>
          <View style={styles.gap8} />
          <View style={styles.closeButton}>
            <InkWell
              onPress={() => dismiss(entry)}
              borderRadius={5}
              highlightColor={kInkHighlightColor}
              splashColor={kInkSplashColor}
              style={styles.closeInk}
            >
              <Icon
                icon={Icons.close}
                size={18}
                color={withOpacity(entry.color, 0.3)}
              />
            </InkWell>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
  },
  item: { overflow: 'visible' },
  itemContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingTop: TOAST_TOP_MARGIN,
  },
  box: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    paddingLeft: 20,
    paddingTop: 16,
    paddingRight: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSlot: { paddingRight: 12 },
  content: { flex: 1 },
  // maxLines 2 with TextOverflow.clip: two lines show, the rest is cut away.
  description: { maxHeight: DESCRIPTION_LINE * 2, overflow: 'hidden' },
  gap8: { width: 8 },
  closeButton: { width: 30, height: 30 },
  closeInk: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
