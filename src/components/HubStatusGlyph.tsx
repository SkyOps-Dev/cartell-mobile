// Port of frontend/lib/components/hub_status_glyph.dart: the hub's broadcast tower, its ✓ / ✗,
// and the status line under them, on a hub's page (and later on its About and Settings pages).
//
// Three states, not two: while the hub is being re-checked (RefreshState.checking) its connection
// is unknown, so the tower is light gray, the ✓ / ✗ is left out, and the line says
// "Status: Checking..." in light gray. Otherwise the tower and the mark are yellow when connected,
// dark gray when not, and the line is white; a failed re-check says "Last known connected" or
// "Last known disconnected".
//
// Layout: a Column (shrink-wrapped, centred) of a Stack and the line (17, centred, on the body
// text style). The Stack centres a 150 × 120 box (the 90 tower, centred, padded 15 above and
// below) and a 115 × 115 box with the 45 mark at its (70, 70); it is 150 × 120, so the mark lands
// at (87.5, 72.5).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Device } from '../models/device';
import { RefreshState } from '../state/genericBloc';
import {
  kCartellDarkGray,
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../theme/colors';
import { ambientTextStyle, merge, toRN } from '../theme/typography';
import { Icon } from './icons/Icon';
import { FontAwesomeIcons } from './icons/iconData';

const TOWER_BOX = { width: 150, height: 90 + 2 * 15 };
const MARK_BOX = 70 + 45;

type Props = {
  device: Device;
  refresh?: RefreshState;
};

export function HubStatusGlyph({
  device,
  refresh = RefreshState.ready,
}: Props) {
  const isChecking = refresh === RefreshState.checking;
  const { isConnected } = device.device;
  const color = isChecking
    ? kCartellLightGray
    : isConnected
    ? kCartellYellow
    : kCartellDarkGray;
  const state = isConnected ? 'Connected' : 'Disconnected';
  const label = isChecking
    ? 'Status: Checking...'
    : refresh === RefreshState.failed
    ? `Status: Last known ${state.toLowerCase()}`
    : `Status: ${state}`;

  return (
    <View style={styles.column}>
      <View style={styles.stack}>
        <View style={styles.towerBox}>
          <Icon
            icon={FontAwesomeIcons.towerBroadcast}
            size={90}
            color={color}
          />
        </View>
        {!isChecking && (
          <View style={styles.mark}>
            <Icon
              icon={
                isConnected ? FontAwesomeIcons.check : FontAwesomeIcons.xmark
              }
              size={45}
              color={color}
            />
          </View>
        )}
      </View>
      <Text
        style={[
          statusText,
          { color: isChecking ? kCartellLightGray : MaterialColors.white },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const statusText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 17 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  stack: { width: TOWER_BOX.width, height: TOWER_BOX.height },
  towerBox: {
    width: TOWER_BOX.width,
    paddingVertical: 15,
    alignItems: 'center',
  },
  mark: {
    position: 'absolute',
    left: (TOWER_BOX.width - MARK_BOX) / 2 + 70,
    top: (TOWER_BOX.height - MARK_BOX) / 2 + 70,
  },
});
