// Port of frontend/lib/screens/sensors/sensors_screen.dart (spec 13 §2, features/16): a hub's
// Sensors list, from the hub page's Sensors button.
//
// AppScaffold with the amber + floating action button (FA plus, black) → Add Sensor, and the ⋮ menu
// (SensorEllipsis: "Pair Sensor", the same). Back and ← → the hub's page (GoToSpecificDeviceEvent).
// Body: Expanded → SafeArea → TimedPullToRefresh (pulled: the hub fetched again, errors dropped)
// → scroll (always scrollable) → Column (centred):
// - Padding(left 10) → ← at the left;
// - "Sensors" (Source Sans Pro, bold, 24, letter-spacing 2, centred, Padding(15 across)), 5;
// - "View existing Sensors or add a Sensor" (Source Sans Pro 16, height 1.25, at most 3 lines,
//   Padding(15, 0, 15, 35));
// - no sensors: at most 300 wide → Padding(15) → ReusableCard (#1D1E33) → Padding(25) →
//   "No Sensors have been added." (17, white, centred, Padding(5 down)), the sensors icon (100,
//   white), "Press the plus button below to get started." (likewise);
//   one sensor: centred, at most 300 wide, a one-column grid of square tiles;
//   two or more: a two-column grid of square tiles, 100 in at each side when the screen is 800
//   or wider; a grid clips to its bounds (the badges' overhang);
// - 35.
// The list keeps the hub it was opened with (initState) and shows its sensors; the pull and the
// bloc's re-check both refresh that same cached hub, so the list follows them.

import React, { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FloatingActionButton } from '../../components/buttons/FloatingActionButton';
import { IconButton } from '../../components/buttons/IconButton';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { ReusableCard } from '../../components/ReusableCard';
import { SensorEllipsis } from '../../components/SensorEllipsis';
import { SensorCard } from '../../components/sensors/SensorCard';
import { FakeBoldText } from '../../components/text/FakeBoldText';
import { TimedPullToRefresh } from '../../components/TimedPullToRefresh';
import type { Device } from '../../models/device';
import { setDevice } from '../../services/requests/deviceRequests';
import {
  GoToAddSensorStart,
  GoToSpecificDeviceEvent,
} from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kActiveCardColor,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import {
  ambientTextStyle,
  kSourceSansPro,
  merge,
  toRN,
} from '../../theme/typography';

const LARGE_SCREEN_SIZE = 800;

export function SensorsScreen({ device: openedWith }: { device: Device }) {
  const readDevicesBloc = useReadDevicesBloc();
  const [device, setShownDevice] = useState(openedWith);
  const windowWidth = useWindowDimensions().width;

  const backToHub = () => {
    readDevicesBloc().add(new GoToSpecificDeviceEvent(openedWith));
  };

  const refreshSensors = async () => {
    try {
      setShownDevice(await setDevice(device.id));
    } catch {
      // PORT-GAP: debugPrint('Error refreshing sensors: $e').
    }
  };

  const sensors = device.device.sensors;

  return (
    <AppScaffold
      floatingActionButton={
        <FloatingActionButton
          backgroundColor={kCartellYellow}
          onPressed={() => {
            readDevicesBloc().add(new GoToAddSensorStart(device));
          }}
        >
          <Icon icon={FontAwesomeIcons.plus} color={MaterialColors.black} />
        </FloatingActionButton>
      }
      actions={<SensorEllipsis device={device} />}
      body={
        <PopScope canPop onPopInvoked={backToHub}>
          <SafeArea style={styles.expanded}>
            <TimedPullToRefresh
              onRefresh={refreshSensors}
              alwaysScrollable
              testID="sensors-list"
            >
              <View style={styles.column}>
                <View style={styles.backRow}>
                  <IconButton
                    icon={FontAwesomeIcons.arrowLeftLong}
                    color={ColorScheme.onSurfaceVariant}
                    onPressed={backToHub}
                  />
                </View>
                <View style={styles.titlePadding}>
                  <FakeBoldText style={title}>Sensors</FakeBoldText>
                </View>
                <View style={styles.gap5} />
                <View style={styles.subtitlePadding}>
                  <Text numberOfLines={3} ellipsizeMode="tail" style={subtitle}>
                    View existing Sensors or add a Sensor
                  </Text>
                </View>
                {sensors.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <ReusableCard cardColor={kActiveCardColor}>
                      <View style={styles.emptyPadding}>
                        <Text style={[label, styles.labelPadding]}>
                          No Sensors have been added.
                        </Text>
                        <Icon
                          icon={Icons.sensors}
                          size={100}
                          color={MaterialColors.white}
                        />
                        <Text style={[label, styles.labelPadding]}>
                          Press the plus button below to get started.
                        </Text>
                      </View>
                    </ReusableCard>
                  </View>
                ) : sensors.length === 1 ? (
                  <View style={[styles.grid, styles.maxWidth300]}>
                    <View style={styles.oneCell}>
                      <SensorCard device={device} sensor={sensors[0]} />
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.grid,
                      styles.twoColumns,
                      windowWidth >= LARGE_SCREEN_SIZE && styles.wideMargins,
                    ]}
                  >
                    {sensors.map(sensor => (
                      <View key={sensor.id} style={styles.halfCell}>
                        <SensorCard device={device} sensor={sensor} />
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.gap35} />
              </View>
            </TimedPullToRefresh>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

// The body's DefaultTextStyle is bodyMedium in onSurface; each Text merges its own style over it.
const title = {
  ...toRN(
    merge(ambientTextStyle, {
      fontFamily: kSourceSansPro,
      letterSpacing: 2,
      fontSize: 24,
    }),
  ),
  // Bold is drawn by FakeBoldText: the font has no bold face.
  fontWeight: 'normal' as const,
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const subtitle = {
  ...toRN(
    merge(ambientTextStyle, {
      fontFamily: kSourceSansPro,
      fontSize: 16,
      height: 1.25,
    }),
  ),
  includeFontPadding: false,
};
// kLabelTextStyle: 17, white.
const label = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 17, color: MaterialColors.white }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { alignItems: 'center' },
  backRow: { alignSelf: 'stretch', paddingLeft: 10, alignItems: 'flex-start' },
  titlePadding: { paddingHorizontal: 15 },
  gap5: { height: 5 },
  subtitlePadding: { paddingLeft: 15, paddingRight: 15, paddingBottom: 35 },
  // The last line wraps, and a wrapped Flutter Text takes all the width it is given, so the card
  // is as wide as it may be: 300, or the whole row.
  emptyBox: { width: '100%', maxWidth: 300, padding: 15 },
  emptyPadding: { padding: 25, alignItems: 'center' },
  labelPadding: { paddingVertical: 5 },
  // A scroll view clips what it shows, so the badges' overhang past the grid is cut off.
  grid: { width: '100%', overflow: 'hidden' },
  maxWidth300: { maxWidth: 300 },
  oneCell: { width: '100%', aspectRatio: 1 },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap' },
  wideMargins: { paddingHorizontal: 100 },
  halfCell: { width: '50%', aspectRatio: 1 },
  gap35: { height: 35 },
});
