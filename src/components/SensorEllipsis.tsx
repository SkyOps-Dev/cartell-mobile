// Port of frontend/lib/components/sensor_ellipsis.dart: the Sensors list's ⋮ menu, one item
// (circlePlus, "Pair Sensor"). Tapping the item closes the menu (Navigator.pop) and then starts Add
// Sensor.

import React from 'react';

import type { Device } from '../models/device';
import { GoToAddSensorStart } from '../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../state/devices/DevicesBlocContext';
import { kAppBarActionsIconColor } from '../theme/colors';
import { FontAwesomeIcons } from './icons/iconData';
import { ListTile } from './lists/ListTile';
import { popMenu, PopupMenuButton, PopupMenuItem } from './popups/PopupMenu';

export function SensorEllipsis({ device }: { device: Device }) {
  const readDevicesBloc = useReadDevicesBloc();
  return (
    <PopupMenuButton
      icon={FontAwesomeIcons.ellipsisVertical}
      color={kAppBarActionsIconColor}
      itemBuilder={() => [
        <PopupMenuItem key="pair-sensor">
          <ListTile
            leadingIcon={FontAwesomeIcons.circlePlus}
            title="Pair Sensor"
            onTap={() => {
              popMenu();
              readDevicesBloc().add(new GoToAddSensorStart(device));
            }}
          />
        </PopupMenuItem>,
      ]}
    />
  );
}
