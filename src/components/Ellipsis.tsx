// Port of frontend/lib/components/ellipsis.dart: the Hubs screen's ⋮ menu, one item
// (circlePlus, "Add Hub"). Tapping the item closes the menu (Navigator.pop) and then dispatches.

import React from 'react';

import { kAppBarActionsIconColor } from '../theme/colors';
import { FontAwesomeIcons } from './icons/iconData';
import { ListTile } from './lists/ListTile';
import { popMenu, PopupMenuButton, PopupMenuItem } from './popups/PopupMenu';

export function Ellipsis() {
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
              // PORT-GAP: context.read<DevicesBloc>().add(GoToAddAHubScreen()).
            }}
          />
        </PopupMenuItem>,
      ]}
    />
  );
}
