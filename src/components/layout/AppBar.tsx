// Port of the Material 3 AppBar as the app uses it (material/app_bar.dart, Flutter 3.41.9): a
// title in a 56 dp toolbar below the status bar, on one solid colour that fills the status bar
// too. Elevation 0, so no shadow.
//
// Layout is NavigationToolbar's (widgets/navigation_toolbar.dart):
// - leading: a 56-wide box at the start, full toolbar height, its IconButton centred
//   (_kLeadingWidth). Scaffolds with a drawer get the DrawerButton here (DrawerButton.tsx).
// - actions: a row at the end, vertically centred, no padding (M3 actionsPadding is zero).
// - title: between them with 16 dp on each side, so it spans leading + 16 to end − actions − 16.
//   Start-aligned on Android and centred on iOS (centerTitle's platform default), and centred
//   vertically. Every title in the app is the logo inside Center, which fills that span, so the
//   two alignments give the same place; a title narrower than its span would need iOS's
//   centre-on-screen rule, which no screen uses.
//
// Icon colours: kAppBarIconColor for the leading button, kAppBarActionsIconColor for actions
// (theme/colors.ts). Call sites pass them to their IconButtons.
// automaticallyImplyLeading: with no leading given and a Scaffold that has a drawer, the leading
// slot gets the DrawerButton.
//
// Status bar icons are light on a dark colour and dark on a light one. Flutter applies that style
// on the frame the bar appears and nothing resets it when the bar goes (no other screen sets one),
// so it is set here on mount and never restored.

import React, { useEffect } from 'react';
import { Image, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { estimateBrightnessForColor } from '../../theme/colors';
import { DrawerButton } from '../buttons/DrawerButton';
import { useScaffold } from './Scaffold';

const TOOLBAR_HEIGHT = 56; // kToolbarHeight
const LEADING_WIDTH = 56; // _kLeadingWidth
const MIDDLE_SPACING = 16; // NavigationToolbar.kMiddleSpacing

type Props = {
  title: React.ReactNode;
  backgroundColor: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
};

export function AppBar({
  title,
  backgroundColor,
  leading: leadingProp,
  actions,
}: Props) {
  const { top } = useSafeAreaInsets();
  const scaffold = useScaffold();
  const leading =
    leadingProp ?? (scaffold?.hasDrawer ? <DrawerButton /> : undefined);
  useEffect(() => {
    StatusBar.setBarStyle(
      estimateBrightnessForColor(backgroundColor) === 'dark'
        ? 'light-content'
        : 'dark-content',
    );
  }, [backgroundColor]);
  return (
    <View style={{ backgroundColor, paddingTop: top }}>
      <View style={styles.toolbar}>
        {leading !== undefined && <View style={styles.leading}>{leading}</View>}
        <View style={styles.middle}>{title}</View>
        {actions !== undefined && <View style={styles.actions}>{actions}</View>}
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
