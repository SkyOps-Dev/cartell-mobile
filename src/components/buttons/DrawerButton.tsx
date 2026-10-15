// Port of material/action_buttons.dart DrawerButton: the hamburger an AppBar puts in its leading
// slot when its Scaffold has a drawer (automaticallyImplyLeading). An IconButton showing
// Icons.menu (24, the AppBar's icon colour onSurface #E6E0E9, measured 2026-10-15) with the
// tooltip "Open navigation menu"; it opens the drawer.

import React from 'react';

import { Icons } from '../icons/iconData';
import { kAppBarIconColor } from '../../theme/colors';
import { useScaffold } from '../layout/Scaffold';
import { IconButton } from './IconButton';

export function DrawerButton() {
  const scaffold = useScaffold();
  return (
    <IconButton
      icon={Icons.menu}
      color={kAppBarIconColor}
      tooltip="Open navigation menu"
      onPressed={() => scaffold?.openDrawer()}
    />
  );
}
