// Port of frontend/lib/components/sensors/sensor_card.dart (spec 13 §1): one tile of a hub's
// Sensors list.
//
// Badge (shown when the sensor is blacklisted: padding 0, a 40 × 40 content, passthrough) →
// Padding(15) → ReusableCard (#1D1E33; tapped: the sensor's page) → Column (centred across):
// Padding(5 down) → the name (17, white, centred); Expanded → Padding(10) → the picture
// (cartell_ct6.png for the onboard sensor, else Sensor.png, contained); for the onboard sensor
// Padding(5 down) → "Onboard Sensor" on the body text style. It fills its grid cell, which the
// Sensors list makes square.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { Device } from '../../models/device';
import type { Sensor } from '../../models/sensor';
import { GoToSpecificSensorScreenEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { kActiveCardColor, MaterialColors } from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { Badge } from '../Badge';
import { ReusableCard } from '../ReusableCard';

export const sensorImage = require('../../../assets/images/Sensor.png');
export const onboardSensorImage = require('../../../assets/images/cartell_ct6.png');

type Props = { sensor: Sensor; device: Device };

export function SensorCard({ sensor, device }: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  const isOnboard = sensor.isOnboardSensor();
  return (
    <Badge
      showBadge={sensor.isBlacklisted}
      contentWidth={40}
      contentHeight={40}
      padding={NO_PADDING}
      passthrough
      style={styles.tile}
    >
      <View style={styles.tilePadding}>
        <ReusableCard
          cardColor={kActiveCardColor}
          style={styles.card}
          onPress={() => {
            readDevicesBloc().add(
              new GoToSpecificSensorScreenEvent(device, sensor),
            );
          }}
        >
          <Text style={[label, styles.name]}>{sensor.name}</Text>
          <View style={styles.pictureBox}>
            <Image
              source={isOnboard ? onboardSensorImage : sensorImage}
              fadeDuration={0}
              resizeMethod="resize"
              resizeMode="contain"
              style={styles.picture}
            />
          </View>
          {isOnboard && (
            <Text style={[body, styles.onboard]}>Onboard Sensor</Text>
          )}
        </ReusableCard>
      </View>
    </Badge>
  );
}

const NO_PADDING = { left: 0, top: 0, right: 0, bottom: 0 };

// kLabelTextStyle: 17, white.
const label = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 17, color: MaterialColors.white }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const body = { ...toRN(ambientTextStyle), includeFontPadding: false };

const styles = StyleSheet.create({
  tile: { flex: 1 },
  tilePadding: { flex: 1, padding: 15 },
  card: { flex: 1, alignItems: 'center' },
  name: { paddingVertical: 5 },
  pictureBox: { flex: 1, alignSelf: 'stretch', padding: 10 },
  picture: { flex: 1, width: '100%' },
  onboard: { paddingVertical: 5 },
});
