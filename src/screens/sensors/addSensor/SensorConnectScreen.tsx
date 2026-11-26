// Port of frontend/lib/screens/sensors/add_sensor/02_sensor_connect_screen.dart (spec 13 §7,
// features/17): Add Sensor, step 3, the search.
//
// On opening (startRun): the searching view, 60 on the counter; the hub must be connected (else
// "Hub is not connected. Reconnect it, wait 15 seconds, and then try again."); pairing mode on
// (not awaited, so its failure goes unseen); then an ImmediateTimer: a check now and every second
// after, each one (not waiting for the last):
// - the session check (a failure skips this one);
// - the hub still connected (else the failure above);
// - the counter down by one, or at 0 the generic failure;
// - the hub's sensor list (a failed read is an uncaught error, and the next second tries again);
//   if it is longer than the list step 1 noted, the sensor not in that list is the new one: the
//   search ends with success, then the new sensor is renamed to the chosen name (a failure there
//   shows nothing; the success view is already up).
// Any end (stop) puts 60 back, shows success or failure, cancels the timer and turns pairing mode
// off (not awaited). A check already under way when the search ends still runs to its end, so it
// can find the sensor and rename it a second time, as in Flutter.
// Cancel cancels the timer, turns pairing mode off and shows the Sensors list. Android Back shows
// the Sensors list without turning pairing mode off (Q11): leaving cancels the timer, and a check
// still under way throws at its next screen update (Flutter's setState after dispose), before it
// could turn pairing mode off.
//
// Body: AppScaffold (no actions) → PopScope → Expanded → Center → scroll → SafeArea →
// Padding(25 across) → Column (centred), one of:
// - searching: "Press and release the red button for 1 second" (22, white, bold), 100,
//   SpinKitPulse (110, white), 30, "Searching for sensor... <n>" (20, white), 15, Padding(20
//   across) → Cancel (blue, black title);
// - success: "The sensor has successfully connected to the Hub." (20, centred), 45, FA circleCheck
//   (70, green), 20, Continue (blue) → the Sensors list;
// - failure: the reason, or "The sensor was unable to connect to the Hub. Please try again. If the
//   problem persists, please contact support." (20, centred), 45, FA circleXmark (70, red), 20,
//   Return (blue) → the Sensors list.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../components/buttons/RoundedButton';
import { Icon } from '../../../components/icons/Icon';
import { FontAwesomeIcons } from '../../../components/icons/iconData';
import { AppScaffold } from '../../../components/layout/AppScaffold';
import { PopScope } from '../../../components/layout/PopScope';
import { SafeArea } from '../../../components/layout/SafeArea';
import { SpinKitPulse } from '../../../components/progress/SpinKitPulse';
import { ScaffoldScrollView } from '../../../components/layout/ScaffoldScrollView';
import type { Device } from '../../../models/device';
import type { Sensor } from '../../../models/sensor';
import { ImmediateTimer } from '../../../services/immediateTimer';
import { reportError } from '../../../services/reportError';
import { AuthRequestManager } from '../../../services/requests/authRequests';
import {
  isDeviceConnectedRequest,
  setPairingModeRequest,
} from '../../../services/requests/deviceRequests';
import {
  setSensors,
  updateSensorData,
} from '../../../services/requests/sensorRequests';
import { GoToSensorsScreenEvent } from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import { kCartellBlue, MaterialColors } from '../../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../../theme/typography';
import type { AddSensorData } from './AddSensor';

const HUB_NOT_CONNECTED =
  'Hub is not connected. Reconnect it, wait 15 seconds, and then try again.';
const UNABLE_TO_CONNECT =
  'The sensor was unable to connect to the Hub. Please try again. If the problem persists, please contact support.';

type View3 = 'searching' | 'success' | 'failure';

export function SensorConnectScreen({
  device,
  data,
}: {
  device: Device;
  data: AddSensorData;
}) {
  const readDevicesBloc = useReadDevicesBloc();
  const [counter, setCounter] = useState(60);
  const [shown, setShown] = useState<View3>('searching');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The State's fields, read by the timer's checks as they run.
  const counterRef = useRef(60);
  const timer = useRef<ImmediateTimer | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // initState: initCount from step 1's list as it is now, then startRun.
    const initCount = data.oldSensors.length;

    /** setState: after dispose it throws (Flutter's `_element!`), ending whatever called it. */
    const update = (apply: () => void) => {
      if (!mounted.current) {
        throw new Error('setState() called after dispose()');
      }
      apply();
    };

    const setPairingMode = (isEnabled: boolean) => {
      // Not awaited: its failure is an uncaught error, which Flutter's Sentry catches.
      setPairingModeRequest(isEnabled, device).catch(reportError);
    };

    const stop = (wasSuccessful: boolean, errorText: string | null = null) => {
      update(() => {
        counterRef.current = 60;
        setCounter(60);
        setShown(wasSuccessful ? 'success' : 'failure');
        setErrorMessage(errorText);
      });
      timer.current?.cancel();
      setPairingMode(false);
    };

    const checkForNewSensor = async () => {
      const status = await new AuthRequestManager().auth();
      if (status.failed) {
        return;
      }
      if (!(await isDeviceConnectedRequest(device))) {
        // PORT-GAP: log.i("Not connected.").
        stop(false, HUB_NOT_CONNECTED);
        return;
      }
      if (counterRef.current > 0) {
        update(() => {
          counterRef.current -= 1;
          setCounter(counterRef.current);
        });
      } else {
        stop(false);
        return;
      }
      const newSensors = await setSensors({ deviceID: device.id });
      if (newSensors.length > initCount) {
        // PORT-GAP: log.i("$newCount >? $oldCount").
        // Adding a sensor starts at the sensor, so the new one is found by what was not there.
        let addedSensor: Sensor | undefined;
        for (const sensor of newSensors) {
          if (!data.oldSensors.includes(sensor)) {
            addedSensor = sensor;
          }
        }
        stop(true);
        if (addedSensor === undefined || data.intendedSensorName === null) {
          // Flutter's `addedSensor!` / `intendedSensorName!`.
          throw new TypeError('Null check operator used on a null value');
        }
        await updateSensorData({
          deviceID: device.id,
          sensorID: addedSensor.id,
          body: { name: data.intendedSensorName },
        });
      }
      // PORT-GAP: log.i('new: $newCount old: $initCount').
    };

    const startRun = async () => {
      update(() => {
        counterRef.current = 60;
        setCounter(60);
        setShown('searching');
      });
      if (!(await isDeviceConnectedRequest(device))) {
        // PORT-GAP: log.i("Not connected.").
        stop(false, HUB_NOT_CONNECTED);
        return;
      }
      // PORT-GAP: log.i("Is connected").
      setPairingMode(true);
      timer.current = new ImmediateTimer({
        durationMs: 1000,
        callback: () => {
          checkForNewSensor().catch(reportError);
        },
      });
    };

    startRun().catch(reportError);
    return () => {
      // dispose: the timer stops; a check under way runs on until its next screen update.
      mounted.current = false;
      timer.current?.cancel();
    };
  }, [data, device]);

  const toSensors = () => {
    readDevicesBloc().add(new GoToSensorsScreenEvent(device));
  };

  return (
    <AppScaffold
      body={
        <PopScope canPop onPopInvoked={toSensors}>
          <ScaffoldScrollView
            style={styles.expanded}
            contentContainerStyle={styles.centre}
          >
            <SafeArea>
              <View style={styles.column}>
                {shown === 'searching' && (
                  <View style={styles.part}>
                    <Text style={pressText}>
                      Press and release the red button for 1 second
                    </Text>
                    <View style={styles.gap100} />
                    <SpinKitPulse size={110} color={MaterialColors.white} />
                    <View style={styles.gap30} />
                    <Text style={searchingText}>
                      {`Searching for sensor... ${counter}`}
                    </Text>
                    <View style={styles.gap15} />
                    <View style={styles.cancelPadding}>
                      <RoundedButton
                        onPressed={() => {
                          timer.current?.cancel();
                          setPairingModeRequest(false, device).catch(
                            reportError,
                          );
                          toSensors();
                        }}
                        title="Cancel"
                        buttonColor={kCartellBlue}
                        buttonTitleColor={MaterialColors.black}
                      />
                    </View>
                  </View>
                )}
                {shown === 'success' && (
                  <View style={styles.part}>
                    <Text style={resultText}>
                      The sensor has successfully connected to the Hub.
                    </Text>
                    <View style={styles.gap45} />
                    <Icon
                      icon={FontAwesomeIcons.circleCheck}
                      size={70}
                      color={MaterialColors.green}
                    />
                    <View style={styles.gap20} />
                    <RoundedButton
                      onPressed={toSensors}
                      title="Continue"
                      buttonColor={kCartellBlue}
                      buttonTitleColor={MaterialColors.black}
                    />
                  </View>
                )}
                {shown === 'failure' && (
                  <View style={styles.part}>
                    <Text style={resultText}>
                      {errorMessage ?? UNABLE_TO_CONNECT}
                    </Text>
                    <View style={styles.gap45} />
                    <Icon
                      icon={FontAwesomeIcons.circleXmark}
                      size={70}
                      color={MaterialColors.red}
                    />
                    <View style={styles.gap20} />
                    <RoundedButton
                      onPressed={() => {
                        timer.current?.cancel();
                        toSensors();
                      }}
                      title="Return"
                      buttonColor={kCartellBlue}
                      buttonTitleColor={MaterialColors.black}
                    />
                  </View>
                )}
              </View>
            </SafeArea>
          </ScaffoldScrollView>
        </PopScope>
      }
    />
  );
}

const pressText = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 22,
      color: MaterialColors.white,
      fontWeight: 'bold',
    }),
  ),
  includeFontPadding: false,
};
const searchingText = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 20, color: MaterialColors.white }),
  ),
  includeFontPadding: false,
};
const resultText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 20 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  centre: { flexGrow: 1, justifyContent: 'center' },
  column: { paddingHorizontal: 25, alignItems: 'center' },
  part: { alignItems: 'center' },
  gap100: { height: 100 },
  gap30: { height: 30 },
  gap15: { height: 15 },
  gap45: { height: 45 },
  gap20: { height: 20 },
  cancelPadding: { paddingHorizontal: 20 },
});
