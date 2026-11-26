// Port of frontend/lib/screens/sensors/edit_sensor.dart (spec 13 §5, features/19): Rename Sensor,
// from a sensor's ⋮ menu.
//
// AppScaffold, actions: a 50-wide gap. Back and ← → the sensor's page
// (GoToSpecificSensorScreenEvent, which re-reads it). Nothing is saved on the way out.
// Body: Expanded → SafeArea → scroll → Column:
// - Padding(left 10) → ← at the left;
// - Row[Padding(15, 35, 15, 20) → FA satelliteDish (24, white), "Rename Sensor" (20, amber, bold)];
// - Row[Expanded → Column(stretch)[ "Enter Your Sensor Name." (20, bold), 25, the Sensor Name
//   field (starting from the sensor's name), 25, Padding(15 above, 5 below) → Submit (blue, black
//   title, FA circleCheck) ]]. No padding across: the field runs edge to edge, as in Flutter.
// Submit sends the field's text as the name and waits for it, sets the name on the shared Sensor
// (so the sensor's page opens on it, and keeps it if its re-read fails), then goes back to the
// sensor's page. Waiting matters: a re-read that beat the rename would bring the old name back.
// A failure shows nothing and stays here (Q27).

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { ScaffoldScrollView } from '../../components/layout/ScaffoldScrollView';
import type { Device } from '../../models/device';
import type { Sensor } from '../../models/sensor';
import { reportError } from '../../services/reportError';
import { updateSensorData } from '../../services/requests/sensorRequests';
import { GoToSpecificSensorScreenEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';

type Props = {
  device: Device;
  sensor: Sensor;
  /** The rename request. A parameter only so a test can hold it open. */
  save?: typeof updateSensorData;
};

export function EditSensor({ device, sensor, save = updateSensorData }: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  // TextEditingController(text: widget.sensor.name), set once in initState.
  const [name, setName] = useState(sensor.name);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const backToSensor = () => {
    readDevicesBloc().add(new GoToSpecificSensorScreenEvent(device, sensor));
  };

  const updateSensor = async () => {
    const newName = name;
    await save({
      deviceID: device.id,
      sensorID: sensor.id,
      body: { name: newName },
    });
    sensor.name = newName;
    if (!mounted.current) {
      return;
    }
    backToSensor();
  };

  return (
    <AppScaffold
      actions={<View style={styles.actionsGap} />}
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
              <View style={styles.headerRow}>
                <View style={styles.iconPadding}>
                  <Icon
                    icon={FontAwesomeIcons.satelliteDish}
                    color={MaterialColors.white}
                  />
                </View>
                <Text style={[headerText, styles.expandedText]}>
                  Rename Sensor
                </Text>
              </View>
              <View style={styles.form}>
                <Text style={promptText}>Enter Your Sensor Name.</Text>
                <View style={styles.gap25} />
                <OutlinedTextField
                  testID="sensorName"
                  labelText="Sensor Name"
                  value={name}
                  onChangeText={setName}
                />
                <View style={styles.gap25} />
                <RoundedButton
                  padding={styles.buttonPadding}
                  onPressed={() => {
                    updateSensor().catch(reportError);
                  }}
                  title="Submit"
                  buttonColor={kCartellBlue}
                  buttonTitleColor={kCartellBlack}
                  icon={FontAwesomeIcons.circleCheck}
                  iconColor={kCartellBlack}
                />
              </View>
            </ScaffoldScrollView>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const headerText = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 20,
      color: kCartellYellow,
      fontWeight: 'bold',
    }),
  ),
  includeFontPadding: false,
};
const promptText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 20, fontWeight: 'bold' })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  actionsGap: { width: 50 },
  backRow: { paddingLeft: 10, alignItems: 'flex-start' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconPadding: {
    paddingLeft: 15,
    paddingTop: 35,
    paddingRight: 15,
    paddingBottom: 20,
  },
  expandedText: { flex: 1 },
  form: { alignSelf: 'stretch' },
  gap25: { height: 25 },
  // Padding(15 above, 5 below) around RoundedButton's own 8.
  buttonPadding: { paddingTop: 15 + 8, paddingBottom: 5 + 8 },
});
