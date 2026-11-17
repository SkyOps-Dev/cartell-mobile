// Port of frontend/lib/screens/sensors/add_sensor/00_enter_name_for_add_sensor.dart (spec 13 §7,
// features/17): Add Sensor, step 1, the name. From the Sensors list's + and ⋮ → Pair Sensor.
//
// AppScaffold, actions: a 40-wide gap. Back and ← → the Sensors list.
// Body: Expanded → SafeArea → scroll → Column (centred): ← (Padding(left 10), at the left), 100,
// "Add a sensor" (25, centred), 35, Padding(20 across) → Column[ Padding(35 down) → FA houseSignal
// (125, amber), the name field (centred, no label, hint "Name of sensor", at most 32 characters
// with the "n/32" counter), Continue (blue, black title, FA circleCheck), 25 ].
// Continue goes on with whatever is typed, empty included (no check).
//
// On opening, the hub is fetched again and its sensors are copied into the list of sensors it
// already had, which step 3 compares against. That list is handed on as it is, so a Continue
// before the fetch lands hands on an empty list that fills in later (Q10).

import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../components/buttons/IconButton';
import { RoundedButton } from '../../../components/buttons/RoundedButton';
import { OutlinedTextField } from '../../../components/forms/OutlinedTextField';
import { Icon } from '../../../components/icons/Icon';
import { FontAwesomeIcons } from '../../../components/icons/iconData';
import { AppScaffold } from '../../../components/layout/AppScaffold';
import { PopScope } from '../../../components/layout/PopScope';
import { SafeArea } from '../../../components/layout/SafeArea';
import type { Device } from '../../../models/device';
import type { Sensor } from '../../../models/sensor';
import { reportError } from '../../../services/reportError';
import { setDevice } from '../../../services/requests/deviceRequests';
import {
  GoToIsRemovingCaseForAddSensor,
  GoToSensorsScreenEvent,
} from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../../theme/typography';

// TextInputType.name: iOS name-phone pad; Android has no React Native equivalent of the
// person-name variation (PARITY_ISSUES P6). Flutter capitalises nothing by default.
const nameKeyboard = Platform.OS === 'ios' ? 'name-phone-pad' : 'default';

/** AddSensorData(oldSensors, intendedSensorName): what step 1 hands to steps 2 and 3. */
export class AddSensorData {
  constructor(
    readonly oldSensors: Sensor[],
    public intendedSensorName: string | null,
  ) {}
}

export function AddSensor({ device }: { device: Device }) {
  const readDevicesBloc = useReadDevicesBloc();
  const [name, setName] = useState('');
  // The State's oldSensorList: one list for the screen's life, filled in when the fetch lands.
  const [oldSensorList] = useState<Sensor[]>(() => []);
  useEffect(() => {
    setDevice(device.id)
      .then(value => {
        for (const sensor of value.device.sensors) {
          oldSensorList.push(sensor);
        }
      })
      .catch(reportError);
  }, [device.id, oldSensorList]);

  const backToSensors = () => {
    readDevicesBloc().add(new GoToSensorsScreenEvent(device));
  };

  return (
    <AppScaffold
      actions={<View style={styles.actionsGap} />}
      body={
        <PopScope canPop onPopInvoked={backToSensors}>
          <SafeArea style={styles.expanded}>
            <ScrollView>
              <View style={styles.column}>
                <View style={styles.backRow}>
                  <IconButton
                    icon={FontAwesomeIcons.arrowLeftLong}
                    color={ColorScheme.onSurfaceVariant}
                    onPressed={backToSensors}
                  />
                </View>
                <View style={styles.gap100} />
                <Text style={titleText}>Add a sensor</Text>
                <View style={styles.gap35} />
                <View style={styles.form}>
                  <View style={styles.iconPadding}>
                    <Icon
                      icon={FontAwesomeIcons.houseSignal}
                      size={125}
                      color={kCartellYellow}
                    />
                  </View>
                  <View style={styles.field}>
                    <OutlinedTextField
                      testID="sensorName"
                      hintText="Name of sensor"
                      value={name}
                      onChangeText={setName}
                      maxLength={32}
                      textAlign="center"
                      autoCapitalize="none"
                      keyboardType={nameKeyboard}
                    />
                  </View>
                  <RoundedButton
                    onPressed={() => {
                      readDevicesBloc().add(
                        new GoToIsRemovingCaseForAddSensor(
                          device,
                          new AddSensorData(oldSensorList, name),
                        ),
                      );
                    }}
                    title="Continue"
                    buttonColor={kCartellBlue}
                    buttonTitleColor={MaterialColors.black}
                    icon={FontAwesomeIcons.circleCheck}
                    iconColor={MaterialColors.black}
                  />
                  <View style={styles.gap25} />
                </View>
              </View>
            </ScrollView>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const titleText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 25 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  actionsGap: { width: 40 },
  column: { alignItems: 'center' },
  backRow: { alignSelf: 'stretch', paddingLeft: 10, alignItems: 'flex-start' },
  gap100: { height: 100 },
  gap35: { height: 35 },
  gap25: { height: 25 },
  form: { alignSelf: 'stretch', paddingHorizontal: 20, alignItems: 'center' },
  iconPadding: { paddingVertical: 35 },
  field: { alignSelf: 'stretch' },
});
