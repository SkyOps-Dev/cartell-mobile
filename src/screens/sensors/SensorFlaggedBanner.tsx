// Port of frontend/lib/screens/sensors/sensor_flagged_banner.dart (spec 13 §3): the warning at the
// top of a blacklisted sensor's page.
//
// Hidden (an empty box) unless the sensor is blacklisted. Otherwise Padding(20 across, 10 down) →
// a box (#EE9999, radius 10, a red border) → Padding(12) → Column (centred) [the message (black,
// centred, wrapping), 8, RoundedButton "Contact Support" (amber, black title)]. A null
// onContactSupport disables the button.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../components/buttons/RoundedButton';
import { kCartellYellow, MaterialColors } from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';

export const SENSOR_FLAGGED_MESSAGE =
  'This sensor has been flagged for suspicious activity. Please contact support to re-activate this sensor';

type Props = {
  isBlacklisted: boolean;
  onContactSupport: (() => void) | null;
};

export function SensorFlaggedBanner({
  isBlacklisted,
  onContactSupport,
}: Props) {
  if (!isBlacklisted) {
    return null;
  }
  return (
    <View style={styles.padding}>
      <View style={styles.box} testID="sensor-flagged-banner">
        <Text style={messageText}>{SENSOR_FLAGGED_MESSAGE}</Text>
        <View style={styles.gap8} />
        <RoundedButton
          title="Contact Support"
          buttonColor={kCartellYellow}
          buttonTitleColor={MaterialColors.black}
          onPressed={onContactSupport}
        />
      </View>
    </View>
  );
}

const messageText = {
  ...toRN(merge(ambientTextStyle, { color: MaterialColors.black })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  padding: { paddingHorizontal: 20, paddingVertical: 10 },
  box: {
    backgroundColor: '#EE9999',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MaterialColors.red,
    padding: 12,
    alignItems: 'center',
  },
  gap8: { height: 8 },
});
