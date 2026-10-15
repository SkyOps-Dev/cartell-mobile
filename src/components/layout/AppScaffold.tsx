// Port of frontend/lib/components/app_scaffold.dart (spec 10 §1, spec 18 §2): the frame of every
// signed-in screen.
// - App bar: the logo (h45) on #25282A, the screen's actions at the end, and the hamburger at the
//   start when there is a drawer.
// - Up to 800 dp wide the NavBar is the Scaffold's drawer; wider, it is an inline rail at the left
//   of the body and there is no drawer (and no hamburger). `showNavigation: false` (the pairing
//   wizard) has neither.
// - Body: Row(crossAxisAlignment start, mainAxisAlignment center) of [rail?, body]; the screen's
//   body takes the rest of the row itself (Expanded).

import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { kCartellAppScaffoldColor } from '../../theme/colors';
import { NavBar } from '../NavBar';
import { AppBar, AppBarLogo } from './AppBar';
import { Scaffold } from './Scaffold';

export const LARGE_SCREEN_SIZE = 800;

type Props = {
  body: React.ReactNode;
  actions?: React.ReactNode;
  floatingActionButton?: React.ReactNode;
  showNavigation?: boolean;
};

export function AppScaffold({
  body,
  actions,
  floatingActionButton,
  showNavigation = true,
}: Props) {
  // LayoutBuilder's maxWidth: the whole window, as the screens fill it.
  const { width } = useWindowDimensions();
  const hasDrawer = showNavigation && width <= LARGE_SCREEN_SIZE;
  const hasRail = showNavigation && width > LARGE_SCREEN_SIZE;
  return (
    <Scaffold
      drawer={hasDrawer ? <NavBar /> : undefined}
      floatingActionButton={floatingActionButton}
      appBar={
        <AppBar
          title={<AppBarLogo />}
          backgroundColor={kCartellAppScaffoldColor}
          actions={actions}
        />
      }
    >
      <View style={styles.row}>
        {hasRail && <NavBar />}
        {body}
      </View>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
