// Port of frontend/lib/screens/sensors/add_sensor/01_remove_case_for_add_sensor.dart (spec 13 §7,
// features/17): Add Sensor, step 2, "Prepare to add".
//
// AppScaffold, actions: ✗ (FA xmark) → the Sensors list. Back and ← do the same.
// Body: Expanded → SafeArea → scroll → Column (centred): ← (Padding(left 10), at the left), 100,
// "Prepare to add" (30, centred), Padding(15 % of the width across once it is over 500, else 15)
// → Column[ Padding(35 down, 25 across) → FA magnifyingGlass (125, amber), "Remove the top of the
// sensor's case. ⏎⏎Find the red button. (Don't press it yet.)" (18, centred), 25, "I see the red
// button!" (blue, black, FA check) → step 3, 25 ].

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../components/buttons/IconButton';
import { RoundedButton } from '../../../components/buttons/RoundedButton';
import { Icon } from '../../../components/icons/Icon';
import { FontAwesomeIcons } from '../../../components/icons/iconData';
import { AppScaffold } from '../../../components/layout/AppScaffold';
import { PopScope } from '../../../components/layout/PopScope';
import { SafeArea } from '../../../components/layout/SafeArea';
import { ScaffoldScrollView } from '../../../components/layout/ScaffoldScrollView';
import type { Device } from '../../../models/device';
import {
  GoToSensorConnectScreen,
  GoToSensorsScreenEvent,
} from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../../theme/typography';
import { useLayoutWidth } from '../../../utilities/layoutWidth';
import type { AddSensorData } from './AddSensor';

const INSTRUCTIONS =
  "Remove the top of the sensor's case. \n\nFind the red button. (Don't press it yet.)";

export function RemoveCaseForAddSensor({
  device,
  data,
}: {
  device: Device;
  data: AddSensorData;
}) {
  const readDevicesBloc = useReadDevicesBloc();
  const [width, onLayout] = useLayoutWidth();
  const lowerPadding = { paddingHorizontal: width > 500 ? width * 0.15 : 15 };
  const backToSensors = () => {
    readDevicesBloc().add(new GoToSensorsScreenEvent(device));
  };

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={backToSensors}
        />
      }
      body={
        <PopScope canPop onPopInvoked={backToSensors}>
          <SafeArea style={styles.expanded}>
            <View style={styles.expanded} onLayout={onLayout}>
              <ScaffoldScrollView>
                <View style={styles.column}>
                  <View style={styles.backRow}>
                    <IconButton
                      icon={FontAwesomeIcons.arrowLeftLong}
                      color={ColorScheme.onSurfaceVariant}
                      onPressed={backToSensors}
                    />
                  </View>
                  <View style={styles.gap100} />
                  <Text style={titleText}>Prepare to add</Text>
                  <View style={[styles.lower, lowerPadding]}>
                    <View style={styles.iconPadding}>
                      <Icon
                        icon={FontAwesomeIcons.magnifyingGlass}
                        size={125}
                        color={kCartellYellow}
                      />
                    </View>
                    <Text style={instructionsText}>{INSTRUCTIONS}</Text>
                    <View style={styles.gap25} />
                    <RoundedButton
                      onPressed={() => {
                        readDevicesBloc().add(
                          new GoToSensorConnectScreen(device, data),
                        );
                      }}
                      title="I see the red button!"
                      buttonColor={kCartellBlue}
                      buttonTitleColor={MaterialColors.black}
                      icon={FontAwesomeIcons.check}
                      iconColor={MaterialColors.black}
                    />
                    <View style={styles.gap25} />
                  </View>
                </View>
              </ScaffoldScrollView>
            </View>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const titleText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 30 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const instructionsText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 18 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { alignItems: 'center' },
  backRow: { alignSelf: 'stretch', paddingLeft: 10, alignItems: 'flex-start' },
  gap100: { height: 100 },
  lower: { alignSelf: 'stretch', alignItems: 'center' },
  iconPadding: { paddingVertical: 35, paddingHorizontal: 25 },
  gap25: { height: 25 },
});
