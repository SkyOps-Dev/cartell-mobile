// Port of the Material 3 AppBar as the app uses it (material/app_bar.dart, Flutter 3.41.9): a
// title in a 56 dp toolbar below the status bar, on one solid colour that fills the status bar
// too. Elevation 0, so no shadow.
//
// Scrolled under: while content in its Scaffold is scrolled up under it (scrolledUnder.ts), the
// bar is raised to elevation 3 (_AppBarDefaultsM3.scrolledUnderElevation). Its shadow colour is
// transparent, so the only change is the colour: the theme's surface tint (#D0BCFF) at 8% over
// it, status bar area included (#25282A becomes #32343B). It switches in one frame: with no shape
// the Material takes AnimatedPhysicalModel's fast path, which does not animate the colour
// (material.dart:511-528). The status bar icons stay as they were: Flutter picks them from the
// untinted colour.
//
// Layout is NavigationToolbar's (widgets/navigation_toolbar.dart):
// - leading: a 56-wide box at the start, full toolbar height, its IconButton centred
//   (_kLeadingWidth). Scaffolds with a drawer get the DrawerButton here (DrawerButton.tsx).
// - actions: a row at the end, vertically centred, no padding (M3 actionsPadding is zero).
// - title: between them with 16 dp on each side, so it spans leading + 16 to end − actions − 16.
//   Start-aligned on Android and centred on iOS (centerTitle's platform default), and centred
//   vertically. Most titles are the logo inside Center, which fills that span, so the two
//   alignments give the same place. A title that only takes its own width (`shrinkWrapTitle`,
//   a plain Text: the QR scanner page) is centred on the whole toolbar on iOS when it fits
//   (NavigationToolbar's centerMiddle), so its span is made symmetric there.
//
// Icon colours: kAppBarIconColor for the leading button, kAppBarActionsIconColor for actions
// (theme/colors.ts). Call sites pass them to their IconButtons.
// automaticallyImplyLeading: with no leading given and a Scaffold that has a drawer, the leading
// slot gets the DrawerButton.
//
// Status bar icons are light on a dark colour and dark on a light one. Flutter applies that style
// on the frame the bar appears and nothing resets it when the bar goes (no other screen sets one),
// so it is set here on mount and never restored.

import React, { useEffect, useState } from 'react';
import { Image, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  applySurfaceTint,
  ColorScheme,
  estimateBrightnessForColor,
} from '../../theme/colors';
import {
  useValueListenable,
  ValueNotifier,
} from '../../utilities/valueNotifier';
import { DrawerButton } from '../buttons/DrawerButton';
import { useScaffold } from './Scaffold';

const TOOLBAR_HEIGHT = 56; // kToolbarHeight
const LEADING_WIDTH = 56; // _kLeadingWidth
const MIDDLE_SPACING = 16; // NavigationToolbar.kMiddleSpacing
const SCROLLED_UNDER_ELEVATION = 3; // _AppBarDefaultsM3.scrolledUnderElevation

/** Outside a Scaffold nothing can scroll under the bar. */
const neverScrolledUnder = new ValueNotifier(false);

type Props = {
  title: React.ReactNode;
  backgroundColor: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  /** The title takes only its own width (a Text), rather than filling the span (Center). */
  shrinkWrapTitle?: boolean;
};

export function AppBar({
  title,
  backgroundColor,
  leading: leadingProp,
  actions,
  shrinkWrapTitle = false,
}: Props) {
  const { top } = useSafeAreaInsets();
  const scaffold = useScaffold();
  const scrolledUnder = useValueListenable(
    scaffold?.scrolledUnder ?? neverScrolledUnder,
  );
  const color = scrolledUnder
    ? applySurfaceTint(
        backgroundColor,
        ColorScheme.surfaceTint,
        SCROLLED_UNDER_ELEVATION,
      )
    : backgroundColor;
  const leading =
    leadingProp ?? (scaffold?.hasDrawer ? <DrawerButton /> : undefined);
  const [actionsWidth, setActionsWidth] = useState(0);
  const leadingWidth = leading !== undefined ? LEADING_WIDTH : 0;
  // iOS, own-width title: the same room on both sides, so it is centred on the toolbar.
  const side = Math.max(leadingWidth, actionsWidth);
  const symmetric =
    Platform.OS === 'ios' && shrinkWrapTitle
      ? {
          marginLeft: side - leadingWidth + MIDDLE_SPACING,
          marginRight: side - actionsWidth + MIDDLE_SPACING,
        }
      : null;
  useEffect(() => {
    StatusBar.setBarStyle(
      estimateBrightnessForColor(backgroundColor) === 'dark'
        ? 'light-content'
        : 'dark-content',
    );
  }, [backgroundColor]);
  return (
    <View style={{ backgroundColor: color, paddingTop: top }}>
      <View style={styles.toolbar}>
        {leading !== undefined && <View style={styles.leading}>{leading}</View>}
        <View style={[styles.middle, symmetric]}>{title}</View>
        {actions !== undefined && (
          <View
            style={styles.actions}
            onLayout={event => setActionsWidth(event.nativeEvent.layout.width)}
          >
            {actions}
          </View>
        )}
      </View>
    </View>
  );
}

const logo = require('../../../assets/images/cartelldigitalreverse.png');
const LOGO_ASPECT = 2081 / 977;

/** `Center(child: Image.asset(cartelldigitalreverse.png, fit: contain, height: 45))`: the title
 * of the app's logo bars (Loading, Maintenance, the main shell, Add Location). */
export function AppBarLogo() {
  return (
    <View style={styles.center}>
      <Image source={logo} resizeMethod="resize" style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    height: TOOLBAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: {
    width: LEADING_WIDTH,
    height: TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    marginHorizontal: MIDDLE_SPACING,
    justifyContent: 'center',
    alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start',
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  center: { alignSelf: 'stretch', alignItems: 'center' },
  logo: { height: 45, aspectRatio: LOGO_ASPECT },
});
