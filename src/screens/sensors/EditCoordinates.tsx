// Port of frontend/lib/screens/sensors/edit_coordinates.dart (spec 13 §6, features/19): Edit
// Coordinates, from a sensor's ⋮ menu or its Set Location button.
//
// AppScaffold, actions: a 35-wide gap. Back and ← → the sensor's page (nothing saved).
// Body: Expanded → SafeArea → LayoutBuilder → scroll → Padding(5) → Column (centred):
// - Padding(10, 0, 30, 0) → ← at the left;
// - Padding(15, 0, 15, 20) → FA satelliteDish (50, white);
// - "Sensor Coordinates" (18, amber, bold);
// - Row[Expanded → Padding(15 % of the width across once it is over 500, else 15) →
//   Column(stretch)[ "Set Your Sensor Coordinates." (16, bold), 15, "Enter Coordinates in DMS
//   format." (14), 25, the Latitude field, 25, the Longitude field, 25, Detect Location (blue,
//   FA mapPin), Submit (amber, FA circleCheck) ]].
// The fields start from the sensor's coordinates, if it has both (seeded once).
//
// Detect Location (geolocator, in this order), each failure a "Can't Get Location" popup:
// location off on the phone; permission refused when asked; permission refused for good; no fix.
// A fix fills both fields with the full numbers (Dart's double.toString).
// Submit: both fields must read as numbers ("Coordinates Needed" otherwise), each is cut to six
// decimal places (not rounded), they are saved (PATCH latitude and longitude), then the sensor's
// page. A failed save shows nothing (Q27). "DMS format" is what the screen says; it reads decimals.

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { showPopupMessage } from '../../components/popups/popups';
import type { Device } from '../../models/device';
import {
  dartDoubleToString,
  dartDoubleTryParse,
} from '../../models/jsonParser';
import type { Sensor } from '../../models/sensor';
import {
  checkPermission,
  getCurrentPosition,
  isLocationServiceEnabled,
  requestPermission,
} from '../../services/geolocator';
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
import { useLayoutWidth } from '../../utilities/layoutWidth';

/**
 * formatCoordinate: the fraction cut to six digits. Text with no "." (a whole number, or nothing)
 * comes back as it is; a trailing "." stays.
 */
export function formatCoordinate(coordinate: string): string {
  const splitString = coordinate.split('.');
  if (splitString.length < 2) {
    return coordinate;
  }
  if (splitString[1].length > 6) {
    splitString[1] = splitString[1].substring(0, 6);
  }
  return `${splitString[0]}.${splitString[1]}`;
}

const CANT_GET_LOCATION = "Can't Get Location";

export function EditCoordinates({
  device,
  sensor,
}: {
  device: Device;
  sensor: Sensor;
}) {
  const readDevicesBloc = useReadDevicesBloc();
  // Seeded once (initState), only when the sensor has both coordinates.
  const [latitude, setLatitude] = useState(() =>
    sensor.hasLatLong() ? String(sensor.latitude) : '',
  );
  const [longitude, setLongitude] = useState(() =>
    sensor.hasLatLong() ? String(sensor.longitude) : '',
  );
  const [width, onLayout] = useLayoutWidth();
  const formPadding = { paddingHorizontal: width > 500 ? width * 0.15 : 15 };
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

  const updateCoordinates = async () => {
    if (
      dartDoubleTryParse(latitude) === null ||
      dartDoubleTryParse(longitude) === null
    ) {
      showPopupMessage({
        title: 'Coordinates Needed',
        message:
          'Enter a latitude and longitude, or tap Detect Location to use where you are now.',
      });
      return;
    }
    await updateSensorData({
      deviceID: device.id,
      sensorID: sensor.id,
      body: {
        latitude: formatCoordinate(latitude),
        longitude: formatCoordinate(longitude),
      },
    });
    if (mounted.current) {
      backToSensor();
    }
  };

  const reportLocationProblem = (message: string) => {
    if (!mounted.current) {
      return;
    }
    showPopupMessage({ title: CANT_GET_LOCATION, message });
  };

  const getLocation = async () => {
    if (!(await isLocationServiceEnabled())) {
      reportLocationProblem(
        'Location services are turned off on this device. Turn them on in Settings, or type the coordinates in by hand.',
      );
      return;
    }
    let permission = await checkPermission();
    if (permission === 'denied') {
      permission = await requestPermission();
      if (permission === 'denied') {
        reportLocationProblem(
          'Cartell needs location access to place this sensor. Allow it when prompted, or type the coordinates in by hand.',
        );
        return;
      }
    }
    if (permission === 'deniedForever') {
      reportLocationProblem(
        'Location access is turned off for Cartell. Turn it on in Settings > Cartell > Location, or type the coordinates in by hand.',
      );
      return;
    }
    let position: { latitude: number; longitude: number };
    try {
      position = await getCurrentPosition();
    } catch {
      // PORT-GAP: _log.w("Could not read a position: $e").
      reportLocationProblem(
        'Could not get a location fix. Move somewhere with a clearer view of the sky and try again, or type the coordinates in by hand.',
      );
      return;
    }
    if (!mounted.current) {
      return;
    }
    setLatitude(dartDoubleToString(position.latitude));
    setLongitude(dartDoubleToString(position.longitude));
  };

  return (
    <AppScaffold
      actions={<View style={styles.actionsGap} />}
      body={
        <PopScope canPop onPopInvoked={backToSensor}>
          <SafeArea style={styles.expanded}>
            <View style={styles.expanded} onLayout={onLayout}>
              <ScrollView>
                <View style={styles.column}>
                  <View style={styles.backRow}>
                    <IconButton
                      icon={FontAwesomeIcons.arrowLeftLong}
                      color={ColorScheme.onSurfaceVariant}
                      onPressed={backToSensor}
                    />
                  </View>
                  <View style={styles.dishPadding}>
                    <Icon
                      icon={FontAwesomeIcons.satelliteDish}
                      size={50}
                      color={MaterialColors.white}
                    />
                  </View>
                  <Text style={headerText}>Sensor Coordinates</Text>
                  <View style={[styles.form, formPadding]}>
                    <Text style={promptText}>Set Your Sensor Coordinates.</Text>
                    <View style={styles.gap15} />
                    <Text style={hintText}>
                      Enter Coordinates in DMS format.
                    </Text>
                    <View style={styles.gap25} />
                    <OutlinedTextField
                      testID="latitude"
                      labelText="Latitude"
                      value={latitude}
                      onChangeText={setLatitude}
                    />
                    <View style={styles.gap25} />
                    <OutlinedTextField
                      testID="longitude"
                      labelText="Longitude"
                      value={longitude}
                      onChangeText={setLongitude}
                    />
                    <View style={styles.gap25} />
                    <RoundedButton
                      stretch
                      onPressed={() => {
                        getLocation().catch(reportError);
                      }}
                      title="Detect Location"
                      buttonColor={kCartellBlue}
                      buttonTitleColor={kCartellBlack}
                      icon={FontAwesomeIcons.mapPin}
                      iconColor={kCartellBlack}
                    />
                    <RoundedButton
                      stretch
                      onPressed={() => {
                        updateCoordinates().catch(reportError);
                      }}
                      title="Submit"
                      buttonColor={kCartellYellow}
                      buttonTitleColor={kCartellBlack}
                      icon={FontAwesomeIcons.circleCheck}
                      iconColor={kCartellBlack}
                    />
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

const headerText = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 18,
      color: kCartellYellow,
      fontWeight: 'bold',
    }),
  ),
  includeFontPadding: false,
};
const promptText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 16, fontWeight: 'bold' })),
  includeFontPadding: false,
};
const hintText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 14 })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  actionsGap: { width: 35 },
  column: { padding: 5, alignItems: 'center' },
  backRow: {
    alignSelf: 'stretch',
    paddingLeft: 10,
    paddingRight: 30,
    alignItems: 'flex-start',
  },
  dishPadding: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 20,
  },
  form: { alignSelf: 'stretch' },
  gap15: { height: 15 },
  gap25: { height: 25 },
});
