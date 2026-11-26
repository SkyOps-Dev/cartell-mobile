// The scroll half of the Material 3 AppBar's "scrolled under" state (material/app_bar.dart
// _handleScrollNotification, Flutter 3.41.9): how the scroll views inside a Scaffold tell its app
// bar that content has scrolled under it. The AppBar then draws its colour tinted (AppBar.tsx).
//
// What Flutter does:
// - The app bar hears every scroll update under its Scaffold (scaffold.dart:3237 wraps the body
//   and the drawer in a ScrollNotificationObserver), but only at notification depth 0
//   (defaultScrollNotificationPredicate): the scroll view nearest the Scaffold, never one inside
//   another scroll view.
// - On each vertical update it is scrolled under while there is content above the viewport
//   (extentBefore > 0): any offset above 0. An iOS bounce at the top is not (its offset is below
//   0). Horizontal updates change nothing.
// - Only a scroll update sets it: a scroll view appearing or going away leaves it as it is.
// - The bar redraws only when the flag flips.
//
// Here the Scaffold holds the flag (useScaffold().scrolledUnder, a ValueNotifier, which notifies
// only on a change). ScaffoldScrollView and RevealingScrollView watch their offset on the UI thread
// and hand over only a flip; LiquidPullToRefresh sets it from the JS scroll handler it already
// has. Each screen shows one vertical scroll view at a time, so that one is always Flutter's
// depth-0 view; horizontal scroll views are plain ScrollViews and never report.

import { useCallback } from 'react';
import { type SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useScaffold } from './Scaffold';

/** extentBefore > 0, for a vertical scroll view at offset `offsetY`. */
export function isScrolledUnder(offsetY: number): boolean {
  'worklet';
  return offsetY > 0;
}

/** Sets the nearest Scaffold's flag; does nothing outside a Scaffold. */
export function useSetScrolledUnder(): (scrolledUnder: boolean) => void {
  const notifier = useScaffold()?.scrolledUnder;
  return useCallback(
    (scrolledUnder: boolean) => {
      if (notifier) {
        notifier.value = scrolledUnder;
      }
    },
    [notifier],
  );
}

/**
 * For an animated scroll view: watches its vertical `offset` on the UI thread and sets the flag
 * only when it flips, so scrolling costs the JS thread nothing. The first value (on mount) is not
 * reported, as a scroll view appearing sends Flutter no update.
 */
export function useScrolledUnderReaction(offset: SharedValue<number>): void {
  const setScrolledUnder = useSetScrolledUnder();
  useAnimatedReaction(
    () => isScrolledUnder(offset.value),
    (scrolledUnder, previous) => {
      if (previous !== null && scrolledUnder !== previous) {
        scheduleOnRN(setScrolledUnder, scrolledUnder);
      }
    },
    [setScrolledUnder],
  );
}
