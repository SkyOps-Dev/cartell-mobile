// The parts of Flutter's Scaffold the app uses so far: the #0A0E21 background, an optional app bar
// on top (the body below it no longer pads for the status bar), a body that ends at the top of the
// keyboard on every frame while it slides (resizeToAvoidBottomInset, true by default), a floating
// action button laid over the body, and a drawer above everything.
//
// Floating action button locations (floating_action_button_location.dart):
// - endFloat (Flutter's default): right edge 16 from the screen's (plus the right inset); bottom
//   edge kb + max(16, viewPadding.bottom − kb + 16) above the screen's bottom, kb being the
//   keyboard inset. So it sits 16 above the navigation bar, and rides 16 above the keyboard.
// - startTop, as Login and Registration use it with no app bar: x = 16 + left inset, y = the top
//   safe-area inset.
//
// Drawer: Scaffold(drawer:) hands it to a DrawerController laid over every other slot
// (Drawer.tsx). openDrawer / closeDrawer reach it through useScaffold(), Flutter's
// Scaffold.maybeOf(context). closeDrawer is guarded by hasDrawer && isDrawerOpen, so it does
// nothing where there is no drawer (the NavBar as a tablet rail) or it is already closing.

import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { kScaffoldBackground } from '../../theme/colors';
import { DrawerController, DrawerControllerHandle } from './Drawer';
import { TopPaddingConsumedContext } from './SafeArea';
import { useViewInsetsSource, ViewInsetsContext } from './viewInsets';

const FAB_MARGIN = 16; // kFloatingActionButtonMargin

export type FloatingActionButtonLocation = 'endFloat' | 'startTop';

type ScaffoldState = {
  hasDrawer: boolean;
  openDrawer(): void;
  closeDrawer(): void;
};

const ScaffoldContext = React.createContext<ScaffoldState | null>(null);

/** Scaffold.maybeOf(context): the nearest Scaffold, or null outside one. */
export function useScaffold(): ScaffoldState | null {
  return React.useContext(ScaffoldContext);
}

type Props = {
  children: React.ReactNode;
  appBar?: React.ReactNode;
  floatingActionButton?: React.ReactNode;
  floatingActionButtonLocation?: FloatingActionButtonLocation;
  drawer?: React.ReactNode;
};

export function Scaffold({
  children,
  appBar,
  floatingActionButton,
  floatingActionButtonLocation = 'endFloat',
  drawer,
}: Props) {
  const insets = useViewInsetsSource();
  const safe = useSafeAreaInsets();
  const bodyStyle = useAnimatedStyle(() => ({
    paddingBottom: insets.bottom.value,
  }));
  const viewPaddingBottom = safe.bottom;
  const endFloatStyle = useAnimatedStyle(() => {
    const keyboard = insets.bottom.value;
    return {
      bottom: Math.max(keyboard + FAB_MARGIN, viewPaddingBottom + FAB_MARGIN),
    };
  });

  const drawerRef = useRef<DrawerControllerHandle>(null);
  const drawerOpened = useRef(false);
  const hasDrawer = drawer !== undefined;
  const openDrawer = useCallback(() => drawerRef.current?.open(), []);
  const closeDrawer = useCallback(() => {
    if (hasDrawer && drawerOpened.current) {
      drawerRef.current?.close();
    }
  }, [hasDrawer]);
  const scaffoldState = useMemo(
    () => ({ hasDrawer, openDrawer, closeDrawer }),
    [hasDrawer, openDrawer, closeDrawer],
  );

  const fab =
    floatingActionButton === undefined ? null : floatingActionButtonLocation ===
      'startTop' ? (
      <View
        pointerEvents="box-none"
        style={[
          styles.fabSlot,
          { top: safe.top, left: FAB_MARGIN + safe.left },
        ]}
      >
        {floatingActionButton}
      </View>
    ) : (
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.fabSlot,
          { right: FAB_MARGIN + safe.right },
          endFloatStyle,
        ]}
      >
        {floatingActionButton}
      </Animated.View>
    );

  const content = (
    <View style={styles.scaffold}>
      {appBar}
      <Animated.View style={[styles.body, bodyStyle]}>
        <TopPaddingConsumedContext.Provider value={appBar !== undefined}>
          {children}
        </TopPaddingConsumedContext.Provider>
      </Animated.View>
      {fab}
    </View>
  );

  return (
    <ViewInsetsContext.Provider value={insets}>
      <ScaffoldContext.Provider value={scaffoldState}>
        {hasDrawer ? (
          <DrawerController
            ref={drawerRef}
            drawer={drawer}
            onOpenedChanged={isOpened => {
              drawerOpened.current = isOpened;
            }}
          >
            {content}
          </DrawerController>
        ) : (
          content
        )}
      </ScaffoldContext.Provider>
    </ViewInsetsContext.Provider>
  );
}

/** Flutter's `if (MediaQuery.of(context).viewInsets.bottom <= 0)`: shown only while no keyboard. */
export function WhenKeyboardHidden({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = React.useContext(ViewInsetsContext);
  return insets?.keyboardShown ? null : <>{children}</>;
}

const styles = StyleSheet.create({
  scaffold: { flex: 1, backgroundColor: kScaffoldBackground },
  body: { flex: 1 },
  fabSlot: { position: 'absolute' },
});
