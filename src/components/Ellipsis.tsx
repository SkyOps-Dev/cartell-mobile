// Port of frontend/lib/components/ellipsis.dart: the Hubs screen's ⋮ menu, one item
// (circlePlus, "Add Hub"). Tapping the item closes the menu (Navigator.pop) and then dispatches.

import React from 'react';

import { GoToAddAHubScreen } from '../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../state/devices/DevicesBlocContext';
import { kAppBarActionsIconColor } from '../theme/colors';
import { FontAwesomeIcons } from './icons/iconData';
import { ListTile } from './lists/ListTile';
import { popMenu, PopupMenuButton, PopupMenuItem } from './popups/PopupMenu';

export function Ellipsis() {
  const readDevicesBloc = useReadDevicesBloc();
  return (
    <PopupMenuButton
      icon={FontAwesomeIcons.ellipsisVertical}
      color={kAppBarActionsIconColor}
      itemBuilder={() => [
        <PopupMenuItem key="add-hub">
          <ListTile
            leadingIcon={FontAwesomeIcons.circlePlus}
            title="Add Hub"
            onTap={() => {
              popMenu();
              readDevicesBloc().add(new GoToAddAHubScreen());
            }}
          />
        </PopupMenuItem>,
      ]}
    />
  );
}
