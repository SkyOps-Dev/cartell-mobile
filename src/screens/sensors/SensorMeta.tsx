// Port of frontend/lib/screens/sensors/sensor_meta.dart (spec 13 §4, features/19): a sensor's
// About page, from its ⋮ menu or its About button.
//
// AppScaffold, actions: ✗ (FA xmark) → the sensor's page (GoToSpecificSensorScreenEvent). Back and
// ← do the same.
// Body: Expanded → SafeArea → scroll → Column(stretch):
// - Padding(10, 0, 50, 0) → ← at the left;
// - Padding(15, 45, 15, 30) → Sensor.png 200 high, contained: always the round sensor, even for
//   the onboard one (Q17);
// - Padding(50 down) → the name (30, centred);
// - "Paired to Hub: " and the hub's name (20);
// - "Date Paired" and when the sensor connected (16), formatted from the server's timestamp as it
//   stands: a UTC time shows UTC clock time, not the phone's (Q43).
// Opening it re-reads the hub and the sensor in the background; their answers update the shared
// models, and the page shows them when it next redraws.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { KeyValuePairDisplay } from '../../components/KeyValuePairDisplay';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { sensorImage } from '../../components/sensors/SensorCard';
import { ScaffoldScrollView } from '../../components/layout/ScaffoldScrollView';
import type { Device } from '../../models/device';
import type { Sensor } from '../../models/sensor';
import { GoToSpecificSensorScreenEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { ColorScheme, kAppBarActionsIconColor } from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { formatDateAndTime } from '../../utilities/textFormatters';

export function SensorMeta({
  device,
  sensor,
}: {
  device: Device;
  sensor: Sensor;
}) {
  const readDevicesBloc = useReadDevicesBloc();
  const backToSensor = () => {
    readDevicesBloc().add(new GoToSpecificSensorScreenEvent(device, sensor));
  };

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={backToSensor}
        />
      }
      body={
        <PopScope canPop onPopInvoked={backToSensor}>
          <SafeArea style={styles.expanded}>
            <ScaffoldScrollView>
              <View style={styles.backRow}>
                <IconButton
                  icon={FontAwesomeIcons.arrowLeftLong}
                  color={ColorScheme.onSurfaceVariant}
                  onPressed={backToSensor}
                />
              </View>
              <View style={styles.picturePadding}>
                <Image
                  source={sensorImage}
                  fadeDuration={0}
                  resizeMethod="resize"
                  resizeMode="contain"
                  style={styles.picture}
                />
              </View>
              <Text style={nameText}>{sensor.name}</Text>
              <KeyValuePairDisplay
                keyStr="Paired to Hub: "
                valueStr={device.name}
                fontSize={20}
              />
              <KeyValuePairDisplay
                keyStr="Date Paired"
                valueStr={
                  sensor.connectionDate === null
                    ? ''
                    : formatDateAndTime(sensor.connectionDate)
                }
                fontSize={16}
              />
            </ScaffoldScrollView>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const nameText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 30 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
  paddingVertical: 50,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  backRow: { paddingLeft: 10, paddingRight: 50, alignItems: 'flex-start' },
  picturePadding: {
    paddingLeft: 15,
    paddingTop: 45,
    paddingRight: 15,
    paddingBottom: 30,
  },
  picture: { height: 200, width: '100%' },
});
