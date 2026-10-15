// Port of material/popup_menu.dart (Flutter 3.41.9) as the app uses it: PopupMenuButton with an
// icon, PopupMenuItems holding a ListTile, PopupMenuPosition.over (spec 07 §3.1).
//
// The button: an IconButton (24, actions colour, tooltip "Show menu") that opens the menu route.
// The route (_PopupMenuRoute, a PopupRoute):
// - Barrier: transparent, dismissible; a tap anywhere outside the menu closes it and goes no
//   further. Android Back closes it. While closing nothing takes touches.
// - Timing: 300 ms, linear on the way in. On the way out the controller runs back over the same
//   300 ms but through Interval(0, 2/3), so nothing moves for the first 100 ms and the rest
//   happens in the last 200.
// - Menu (_PopupMenu): a Material (surfaceContainer #211F26, radius 4, elevation 3, black
//   shadow), not clipped. Its contents are IntrinsicWidth(stepWidth 56) inside min 112 / max 280:
//   the widest item rounded up to a multiple of 56; a vertical padding of 8 above and below.
//   With n items, unit = 1 / (n + 1.5): the whole menu fades in over the first third; its width
//   grows over [0, unit] and its height over [0, unit × n], from the top end (the contents stay
//   full size, top-right aligned, and are hidden by their own fades meanwhile); item i fades in
//   over [(i + 1) unit, (i + 2.5) unit].
// - Position (_PopupMenuRouteLayout): its top at the button's top, right-aligned with the button
//   when the button is nearer the right edge (left-aligned when nearer the left), then kept 8 dp
//   inside the safe area on every side, using its current (animating) size.
// Measured on the Flutter Hubs screen (RMX5070, 2026-10-15): x 552–1055, bottom row 346, #211F26,
// i.e. 168 × 72 dp at (184, statusBar + 8).
//
// PopupMenuItem: at least 48 tall, padding 12 left and right, child aligned centre-start, its own
// InkWell that closes the menu (Navigator.pop) and then runs its onTap. A ListTile inside it
// (contentPadding 0, title labelLarge onSurface) has an InkWell of its own, which wins the tap.
// LATER(part 36): press-and-hold on such a ListTile also shows the item's own highlight after
// 100 ms in Flutter (both tap recognisers pass their deadline before the arena decides).

import React, {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  BackHandler,
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  ColorScheme,
  kInkHighlightColor,
  kInkSplashColor,
} from '../../theme/colors';
import { IconButton } from '../buttons/IconButton';
import type { IconData } from '../icons/iconData';
import { InkWell } from '../ink/InkWell';
import { ListTileTheme } from '../lists/ListTile';
import { M3 } from '../../theme/typography';

const MENU_DURATION_MS = 300; // _kMenuDuration
const CLOSE_INTERVAL_END = 2 / 3; // _kMenuCloseIntervalEnd
const WIDTH_STEP = 56; // _kMenuWidthStep
const MIN_WIDTH = 2 * WIDTH_STEP;
const MAX_WIDTH = 5 * WIDTH_STEP;
const SCREEN_PADDING = 8; // _kMenuScreenPadding
const MENU_PADDING_VERTICAL = 8; // menuPadding (M3)
const ITEM_MIN_HEIGHT = 48; // kMinInteractiveDimension
const ITEM_PADDING_HORIZONTAL = 12; // _PopupMenuDefaultsM3.menuItemPadding

type Anchor = { x: number; y: number; width: number; height: number };

type MenuRoute = {
  id: number;
  items: React.ReactElement[];
  anchor: Anchor;
  closing: boolean;
  /** The route's AnimationController value, 0..1. */
  controller: SharedValue<number>;
  /** 1 while the controller runs in reverse (the reverse curve applies). */
  reversing: SharedValue<number>;
};

// --- store -------------------------------------------------------------------------------

let routes: MenuRoute[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => routes;

function showMenu(items: React.ReactElement[], anchor: Anchor): void {
  routes = [
    ...routes,
    {
      id: nextId++,
      items,
      anchor,
      closing: false,
      controller: makeMutable(0),
      reversing: makeMutable(0),
    },
  ];
  emit();
}

function removeRoute(id: number) {
  routes = routes.filter(route => route.id !== id);
  emit();
}

/** Navigator.pop from inside the menu: closes the top-most open menu. */
export function popMenu(): void {
  const route = [...routes].reverse().find(r => !r.closing);
  if (route === undefined) {
    return;
  }
  route.closing = true;
  // A new array, so the host re-renders and the closing menu stops taking touches.
  routes = [...routes];
  emit();
  route.reversing.value = 1;
  const from = route.controller.value;
  route.controller.value = withTiming(
    0,
    { duration: MENU_DURATION_MS * from, easing: Easing.linear },
    finished => {
      if (finished) {
        scheduleOnRN(removeRoute, route.id);
      }
    },
  );
}

// --- button and item ---------------------------------------------------------------------

type ButtonProps = {
  icon: IconData;
  color: string;
  /** itemBuilder: the menu's PopupMenuItems, built when it opens. */
  itemBuilder: () => React.ReactElement[];
};

/** PopupMenuButton with an icon. */
export function PopupMenuButton({ icon, color, itemBuilder }: ButtonProps) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const showButtonMenu = () => {
    const items = itemBuilder();
    if (items.length === 0) {
      return;
    }
    ref.current?.measureInWindow((x, y, width, height) => {
      showMenu(items, { x, y, width, height });
    });
  };
  return (
    <View ref={ref} collapsable={false}>
      <IconButton
        icon={icon}
        color={color}
        tooltip="Show menu"
        onPressed={showButtonMenu}
      />
    </View>
  );
}

/** The ListTileTheme a PopupMenuItem gives its child: no content padding, labelLarge titles. */
const menuItemListTileTheme = {
  contentPadding: { start: 0, end: 0 },
  titleTextStyle: { ...M3.labelLarge, color: ColorScheme.onSurface },
};

/** PopupMenuItem: closes the menu, then runs onTap. */
export function PopupMenuItem({
  onTap,
  children,
}: {
  onTap?: () => void;
  children: React.ReactNode;
}) {
  // The item's InkWell lies behind its content and fills the item; the content (a ListTile with
  // an InkWell of its own) sits on top and takes the taps over it, so the item's ink answers only
  // the 12 dp padding at each side, as the inner recogniser wins Flutter's arena over the tile.
  return (
    <ListTileTheme value={menuItemListTileTheme}>
      <View style={styles.item} accessibilityRole="menuitem">
        <InkWell
          onPress={() => {
            popMenu();
            onTap?.();
          }}
          highlightColor={kInkHighlightColor}
          splashColor={kInkSplashColor}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.itemContent} pointerEvents="box-none">
          {children}
        </View>
      </View>
    </ListTileTheme>
  );
}

// --- host --------------------------------------------------------------------------------

/** Renders open menus above the screens. Mount once, below the dialogs' host. */
export function PopupMenuHost() {
  const open = useSyncExternalStore(subscribe, snapshot);
  const hasOpen = open.some(route => !route.closing);
  useEffect(() => {
    if (!hasOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        popMenu();
        return true;
      },
    );
    return () => subscription.remove();
  }, [hasOpen]);
  return (
    <>
      {open.map(route => (
        <PopupMenuRoute key={route.id} route={route} />
      ))}
    </>
  );
}

function PopupMenuRoute({ route }: { route: MenuRoute }) {
  const window = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const naturalWidth = useRef<number | null>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  const fullWidth = useRef(0);

  // IntrinsicWidth(stepWidth: 56) inside min 112 / max 280, within the screen less 8 and the
  // safe area on each side.
  const onMeasure = (event: LayoutChangeEvent) => {
    if (naturalWidth.current !== null) {
      return;
    }
    naturalWidth.current = event.nativeEvent.layout.width;
    const maxWidth = Math.min(
      MAX_WIDTH,
      window.width - 2 * SCREEN_PADDING - safe.left - safe.right,
    );
    fullWidth.current = Math.min(
      Math.max(
        Math.ceil(naturalWidth.current / WIDTH_STEP) * WIDTH_STEP,
        MIN_WIDTH,
      ),
      maxWidth,
    );
    setSize({ w: fullWidth.current, h: 0 });
  };

  const start = useCallback(() => {
    route.controller.value = withTiming(1, {
      duration: MENU_DURATION_MS,
      easing: Easing.linear,
    });
  }, [route]);

  const onContentLayout = (event: LayoutChangeEvent) => {
    if (size === null || size.h !== 0) {
      return;
    }
    const maxHeight =
      window.height - 2 * SCREEN_PADDING - safe.top - safe.bottom;
    setSize({
      w: fullWidth.current,
      h: Math.min(event.nativeEvent.layout.height, maxHeight),
    });
    start();
  };

  const n = route.items.length;
  const unit = 1 / (n + 1.5);
  const { anchor } = route;
  const anchorLeft = anchor.x;
  const anchorRight = window.width - (anchor.x + anchor.width);
  const screenWidth = window.width;
  const screenHeight = window.height;
  const padLeft = safe.left;
  const padRight = safe.right;
  const padTop = safe.top;
  const padBottom = safe.bottom;
  const menuW = size?.w ?? 0;
  const menuH = size?.h ?? 0;

  const materialStyle = useAnimatedStyle(() => {
    const c = route.controller.value;
    const v =
      route.reversing.value === 1 ? Math.min(c / CLOSE_INTERVAL_END, 1) : c;
    const w = menuW * Math.min(v / unit, 1);
    const h = menuH * Math.min(v / (unit * n), 1);
    // Nearer the right edge: grow leftwards from the button's right edge. Otherwise (and when
    // equidistant, reading left to right) from its left edge.
    let x =
      anchorLeft > anchorRight ? screenWidth - anchorRight - w : anchorLeft;
    if (x < SCREEN_PADDING + padLeft) {
      x = SCREEN_PADDING + padLeft;
    } else if (x + w > screenWidth - SCREEN_PADDING - padRight) {
      x = screenWidth - w - SCREEN_PADDING - padRight;
    }
    let y = anchor.y;
    if (y < SCREEN_PADDING + padTop) {
      y = SCREEN_PADDING + padTop;
    } else if (y + h > screenHeight - SCREEN_PADDING - padBottom) {
      y = screenHeight - h - SCREEN_PADDING - padBottom;
    }
    return {
      left: x,
      top: y,
      width: w,
      height: h,
      opacity: Math.min(v * 3, 1),
    };
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={route.closing ? 'none' : 'auto'}
    >
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderRelease={() => popMenu()}
      />
      {size === null && (
        // Measures the widest item, unconstrained (IntrinsicWidth's max intrinsic width).
        <View
          style={styles.measure}
          pointerEvents="none"
          onLayout={onMeasure}
          testID="popup-menu-measure"
        >
          {route.items.map((item, i) => (
            <View key={i}>{item}</View>
          ))}
        </View>
      )}
      {size !== null && (
        <Animated.View style={[styles.material, materialStyle]}>
          <View
            style={[styles.content, { width: size.w }]}
            onLayout={onContentLayout}
            accessibilityRole="menu"
            testID="popup-menu-content"
          >
            {route.items.map((item, i) => (
              <MenuItemFade key={i} route={route} index={i} unit={unit}>
                {item}
              </MenuItemFade>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function MenuItemFade({
  route,
  index,
  unit,
  children,
}: {
  route: MenuRoute;
  index: number;
  unit: number;
  children: React.ReactNode;
}) {
  const start = (index + 1) * unit;
  const end = Math.min(start + 1.5 * unit, 1);
  const style = useAnimatedStyle(() => {
    const c = route.controller.value;
    const v =
      route.reversing.value === 1 ? Math.min(c / CLOSE_INTERVAL_END, 1) : c;
    return {
      opacity: Math.min(Math.max((v - start) / (end - start), 0), 1),
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  measure: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    alignItems: 'flex-start',
  },
  material: {
    position: 'absolute',
    backgroundColor: ColorScheme.surfaceContainer,
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000000',
    overflow: 'visible',
  },
  content: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: MENU_PADDING_VERTICAL,
  },
  item: { minHeight: ITEM_MIN_HEIGHT, justifyContent: 'center' },
  // Align(centerStart) around a ListTile, which takes all the width it is given.
  itemContent: {
    paddingHorizontal: ITEM_PADDING_HORIZONTAL,
    alignItems: 'stretch',
  },
});
