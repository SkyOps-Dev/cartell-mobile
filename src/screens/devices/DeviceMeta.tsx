// Port of frontend/lib/screens/devices/device_meta.dart (spec 10 §5): a hub's About page, from its
// ⋮ menu.
//
// AppScaffold, actions: ✗ (FA xmark) → the hub's page (GoToSpecificDeviceEvent). Back and ← do the
// same.
// Body: PopScope → Expanded → SafeArea → scroll → Column(stretch):
// - Padding(left 10) → ← at the left;
// - Padding(35 above, 15 below) → the hub's name (30, centred);
// - Padding(10) → HubStatusGlyph, with the state's RefreshState (Checking... until the hub has
//   been fetched again);
// - dividers (Padding(20 across) → Divider(white60, 1)) around three rows: "Mac Address",
//   "Controller Firmware Version" (esp32), "Transmitter Firmware Version" (rfm6601); a version the
//   server left out reads "null", as Dart's toString does;
// - Padding(10 down; 15 % of the width across once it is 500 or more) → Padding(10) → a centred
//   sideways scroll → Padding(10 across, 20 down) → "Last Updated: " and the time *now*, read on
//   every build (so it moves on when the re-check lands).
// No pull-to-refresh here.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { HubStatusGlyph } from '../../components/HubStatusGlyph';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { KeyValuePairDisplay } from '../../components/KeyValuePairDisplay';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import type { Device } from '../../models/device';
import { GoToSpecificDeviceEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { RefreshState } from '../../state/genericBloc';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { useLayoutWidth } from '../../utilities/layoutWidth';
import { formatDateAndTime } from '../../utilities/textFormatters';

type Props = {
  device: Device;
  refresh?: RefreshState;
};

export function DeviceMeta({ device, refresh = RefreshState.ready }: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  const [width, onLayout] = useLayoutWidth();
  const backToHub = () => {
    readDevicesBloc().add(new GoToSpecificDeviceEvent(device));
  };
  const lowerPadding = { paddingHorizontal: width < 500 ? 0 : width * 0.15 };

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={backToHub}
        />
      }
      body={
        <PopScope canPop onPopInvoked={backToHub}>
          <SafeArea style={styles.expanded}>
            <View style={styles.expanded} onLayout={onLayout}>
              <ScrollView>
                <View style={styles.backRow}>
                  <IconButton
                    icon={FontAwesomeIcons.arrowLeftLong}
                    color={ColorScheme.onSurfaceVariant}
                    onPressed={backToHub}
                  />
                </View>
                <Text style={nameText}>{device.name}</Text>
                <View style={styles.glyphPadding}>
                  <HubStatusGlyph device={device} refresh={refresh} />
                </View>
                <WhiteDivider />
                <KeyValuePairDisplay
                  keyStr="Mac Address"
                  valueStr={device.device.macAddress}
                />
                <WhiteDivider />
                <KeyValuePairDisplay
                  keyStr="Controller Firmware Version"
                  valueStr={String(device.device.esp32AppVersion)}
                />
                <WhiteDivider />
                <KeyValuePairDisplay
                  keyStr="Transmitter Firmware Version"
                  valueStr={String(device.device.rfm6601AppVersion)}
                />
                <WhiteDivider />
                <View style={[styles.lower, lowerPadding]}>
                  <View style={styles.lastUpdatedPadding}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.sideways}
                    >
                      <View style={styles.lastUpdatedRow}>
                        <Text style={bodyText}>{LAST_UPDATED}</Text>
                        <Text style={bodyText}>
                          {formatDateAndTime(new Date())}
                        </Text>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </ScrollView>
            </View>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

/** Padding(20 across) → Divider(color: white60, thickness: 1). */
function WhiteDivider() {
  return (
    <View style={styles.dividerPadding}>
      <Divider color={MaterialColors.white60} thickness={1} />
    </View>
  );
}

// Its trailing space is part of the text.
const LAST_UPDATED = 'Last Updated: ';

const bodyText = { ...toRN(ambientTextStyle), includeFontPadding: false };
const nameText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 30 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
  paddingTop: 35,
  paddingBottom: 15,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  backRow: { paddingLeft: 10, alignItems: 'flex-start' },
  glyphPadding: { padding: 10 },
  dividerPadding: { paddingHorizontal: 20 },
  lower: { paddingVertical: 10, alignItems: 'center' },
  lastUpdatedPadding: { padding: 10, alignItems: 'center', maxWidth: '100%' },
  sideways: { flexGrow: 0 },
  lastUpdatedRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
});
