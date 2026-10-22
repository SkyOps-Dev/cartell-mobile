// Port of frontend/lib/components/navbar.dart (spec 10 §1): the side menu. The same component is the
// Scaffold's drawer at 800 dp wide and below, and an inline rail above that (AppScaffold.tsx).
//
// - The user is the first one held for the side menu, read when the menu is built: each time the
//   drawer opens, as Flutter builds the drawer only then. None held throws NoUserObjectFound.
// - A user with an email: Drawer(#54585A) → scrolling list (no padding) →
//   UserAccountsDrawerHeader(#54585A; avatar.png clipped round; "<first> <last>" at 14; the
//   email at 14, left out when the text is very large: bigFont at 18), then five ListTiles
//   (leading Font Awesome icon at 30, title at 14) with Dividers (thickness 1, indents 10)
//   between them.
// - A user with an empty email: only Center(Text("Unable to get current user. Please restart the
//   app and try again.")) in place of the drawer, in the Scaffold's ambient text style, with no
//   panel colour. Center fills the space it is given, so in the drawer slot it spans the screen.
// - Every entry first closes the drawer when there is one (Scaffold.maybeOf(context)
//   ?.closeDrawer(); never a Navigator pop, which would take the page in the rail), then
//   dispatches. Account Settings and Log Out dispatch so far; the others are marked where their
//   event goes.

import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { firstPersistedUser } from '../services/data/userPersistor';
import { NoUserObjectFound } from '../services/exceptions';
import { AttemptLogOutEvent } from '../state/auth/authBloc';
import { useAuthBloc } from '../state/auth/AuthBlocContext';
import { GoToAccountSettingsScreen } from '../state/mainApp/mainAppBloc';
import { useMainAppBloc } from '../state/mainApp/MainAppBlocContext';
import { kCartellDarkGray } from '../theme/colors';
import { ambientTextStyle, toRN } from '../theme/typography';
import { useBigFont } from '../utilities/scaling';
import { FontAwesomeIcons, IconData } from './icons/iconData';
import { Drawer } from './layout/Drawer';
import { UserAccountsDrawerHeader } from './layout/DrawerHeader';
import { useScaffold } from './layout/Scaffold';
import { Divider } from './lists/Divider';
import { ListTile } from './lists/ListTile';

const avatar = require('../../assets/images/avatar.png');
const entryTitleStyle = { fontSize: 14 };

export function NavBar() {
  // initState: the first user in DataPersistor<User>.
  // LATER(part 6): read from the shared cache (DataPersistor<User>), not the side menu's stand-in.
  const [currentUser] = React.useState(() => {
    const user = firstPersistedUser();
    if (user === undefined) {
      throw new NoUserObjectFound(
        "The user doesn't seem to be set in the userPersistor()",
      );
    }
    return user;
  });
  const scaffold = useScaffold();
  const authBloc = useAuthBloc();
  const mainAppBloc = useMainAppBloc();
  const bigFont = useBigFont(18);
  const windowWidth = useWindowDimensions().width;

  // _dismissDrawerIfOpen
  const dismissDrawerIfOpen = () => scaffold?.closeDrawer();

  if (currentUser.email === '') {
    return (
      <View style={[styles.center, { width: windowWidth }]}>
        <Text style={noUserStyle}>
          Unable to get current user. Please restart the app and try again.
        </Text>
      </View>
    );
  }

  const entry = (icon: IconData, title: string, onTap: () => void) => (
    <ListTile
      leadingIcon={icon}
      leadingIconSize={30}
      title={title}
      titleStyle={entryTitleStyle}
      onTap={onTap}
    />
  );
  const divider = <Divider thickness={1} indent={10} endIndent={10} />;

  return (
    <Drawer backgroundColor={kCartellDarkGray}>
      <ScrollView>
        <UserAccountsDrawerHeader
          backgroundColor={kCartellDarkGray}
          picture={
            <Image
              source={avatar}
              resizeMethod="resize"
              resizeMode="cover"
              style={styles.avatar}
            />
          }
          accountName={`${currentUser.firstName} ${currentUser.lastName}`}
          accountEmail={bigFont ? null : currentUser.email}
        />
        {entry(FontAwesomeIcons.user, 'Account Settings', () => {
          dismissDrawerIfOpen();
          mainAppBloc.add(new GoToAccountSettingsScreen());
        })}
        {divider}
        {entry(FontAwesomeIcons.clockRotateLeft, 'Event History', () => {
          dismissDrawerIfOpen();
          // LATER(part 35): context.read<MainAppBloc>().add(GoToEventHistoryScreen()).
        })}
        {divider}
        {entry(FontAwesomeIcons.satelliteDish, 'HUBs', () => {
          dismissDrawerIfOpen();
          // LATER(part 6): context.read<MainAppBloc>().add(GoToHubsScreenEvent()). On the Hubs
          // screen it sends the live DevicesBloc home: with no hubs, the loading screen and a fresh
          // GET /devices/, then the Hubs screen again (the developer chose to leave this off for
          // now, 2026-10-15).
        })}
        {divider}
        {entry(FontAwesomeIcons.headset, 'Help', () => {
          dismissDrawerIfOpen();
          // LATER(part 20): context.read<MainAppBloc>().add(GoToContactUsScreen()).
        })}
        {divider}
        {entry(FontAwesomeIcons.arrowRightFromBracket, 'Log Out', () => {
          dismissDrawerIfOpen();
          authBloc.add(new AttemptLogOutEvent());
        })}
      </ScrollView>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const noUserStyle = toRN(ambientTextStyle);
