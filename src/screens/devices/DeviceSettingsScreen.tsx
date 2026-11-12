// Port of frontend/lib/screens/devices/device_settings_screen.dart (spec 10 §6): Hub settings,
// from the Hub Settings button on a hub's page.
//
// AppScaffold, actions: ✗ (FA xmark) → the hub's page (GoToSpecificDeviceEvent). Back and ← do the
// same.
// Body: PopScope → Expanded → SafeArea → a scroll whose scrollbar stays visible → Column(stretch):
// - Padding(left 10) → ← at the left;
// - Padding(15 below) → the hub's name (30, centred);
// - Padding(10) → HubStatusGlyph, with the state's RefreshState;
// - Padding(20, 15, 20, 0) → Divider(white60, 1);
// - five switch rows, each Padding(20 across, 2 down) → Row(spaceBetween)[Flexible(label, 16), 10,
//   SynchronizedAutoSwitch], with Padding(20 across, 1 down) → Divider(white60, 1) after each:
//   - "Enable Onboard Sensor:" (should_use_onboard_sensor);
//   - "Enable Integrator Support:" (should_use_emulated_sensor); while it is on, 10 and a centred
//     "Pair Integrator" (ElevatedButton, amber label) under it. Its setter redraws the screen
//     (setState), so the button follows the switch;
//   - "Receive Hub Notifications:" (should_send_notification);
//   - "Receive Connection Notifications:" (should_send_connection_notification);
//   - "Receive Email Notifications:" (should_send_email).
// Each switch writes into the cached hub, so the hub's other screens follow it.
// Toasts, as Flutter words them: "Notifications turned on." for both notification switches (and
// "Notifications failed to turn on."), "Email notifications turned …", "Integrator support turned
// …", whose failure says "Email notifications failed to turn …" (a copy-paste slip in Flutter).
//
// Onboard sensor: with the hub disconnected it flips, flips back and says "Hub is not connected.
// Please connect hub and try again." (no request, as in Flutter). Connected, it saves:
// "Onboard sensor turned on." or "Error encountered of type: <type>. Onboard sensor turned off.
// Please try again soon." (a failure names the state the sensor stays in).
//
// Pair Integrator sends pair_to_integrator without waiting, and shows "Sent pairing message
// successfully" at once, whatever the answer.
//
// Django stays closed (decided 2026-11-05): all five switches and Pair Integrator go to Node,
// which also tells a connected hub about an onboard change at once (since F07).

import React, { useEffect, useReducer, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ElevatedButton } from '../../components/buttons/ElevatedButton';
import { IconButton } from '../../components/buttons/IconButton';
import { SynchronizedAutoSwitch } from '../../components/forms/AutoSwitch';
import { HubStatusGlyph } from '../../components/HubStatusGlyph';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import type { Device } from '../../models/device';
import { showSuccess } from '../../components/popups/toasts';
import { reportError } from '../../services/reportError';
import {
  pairToIntegrator,
  setDeviceConnectionNotificationPolicy,
  setDeviceEmailNotificationPolicy,
  setDeviceIntegratorSupport,
  setDeviceNotificationPolicy,
  setOnboardSensor,
} from '../../services/requests/deviceRequests';
import { ResultOf } from '../../services/result';
import { GoToSpecificDeviceEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { RefreshState } from '../../state/genericBloc';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { dartTypeName } from '../../utilities/dartTypeName';

type Props = {
  device: Device;
  refresh?: RefreshState;
};

const onOff = (value: boolean) => (value ? 'on' : 'off');

/** A switch that saves on Node: the toast says `what` turned on/off, or failed to. */
function savesOnNode(
  save: () => Promise<void>,
  succeeded: string,
  failed: string,
): Promise<ResultOf<string>> {
  return save().then(
    () => ResultOf.success(succeeded),
    () => ResultOf.failure({ message: failed }),
  );
}

export function DeviceSettingsScreen({
  device,
  refresh = RefreshState.ready,
}: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  const [, rebuild] = useReducer((count: number) => count + 1, 0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const backToHub = () => {
    readDevicesBloc().add(new GoToSpecificDeviceEvent(device));
  };

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
            <ScrollView persistentScrollbar testID="hub-settings">
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
              <View style={styles.firstDivider}>
                <Divider color={MaterialColors.white60} thickness={1} />
              </View>

              <SwitchRow label="Enable Onboard Sensor:">
                <SynchronizedAutoSwitch
                  obj={device}
                  getOnObject={d => d.shouldUseOnboardSensor}
                  setOnObject={(d, value) => {
                    d.shouldUseOnboardSensor = value;
                  }}
                  processTap={async value => {
                    if (!device.device.isConnected) {
                      return ResultOf.failure({
                        message:
                          'Hub is not connected. Please connect hub and try again.',
                      });
                    }
                    try {
                      await setOnboardSensor(device.id, value);
                    } catch (error) {
                      return ResultOf.failure({
                        message: `Error encountered of type: ${dartTypeName(
                          error,
                        )}. Onboard sensor turned ${onOff(
                          !value,
                        )}. Please try again soon.`,
                      });
                    }
                    return ResultOf.success(
                      `Onboard sensor turned ${onOff(value)}.`,
                    );
                  }}
                />
              </SwitchRow>
              <RowDivider />

              <SwitchRow
                label="Enable Integrator Support:"
                below={
                  device.shouldUseEmulatedSensor && (
                    <View style={styles.pairColumn}>
                      <View style={styles.gap10Tall} />
                      <ElevatedButton
                        label="Pair Integrator"
                        labelColor={kCartellYellow}
                        onPressed={() => {
                          // Not awaited, so Flutter's try/catch never sees a failure: the toast
                          // always shows, "Did not send pairing message" never does, and a
                          // failure is the uncaught error Flutter's Sentry would catch.
                          pairToIntegrator(device.id).catch(reportError);
                          showSuccess('Sent pairing message successfully');
                        }}
                      />
                    </View>
                  )
                }
              >
                <SynchronizedAutoSwitch
                  obj={device}
                  getOnObject={d => d.shouldUseEmulatedSensor}
                  setOnObject={(d, value) => {
                    if (mounted.current) {
                      d.shouldUseEmulatedSensor = value;
                      rebuild();
                    }
                  }}
                  processTap={value =>
                    savesOnNode(
                      () => setDeviceIntegratorSupport(device.id, value),
                      `Integrator support turned ${onOff(value)}.`,
                      `Email notifications failed to turn ${onOff(value)}.`,
                    )
                  }
                />
              </SwitchRow>
              <RowDivider />

              <SwitchRow label="Receive Hub Notifications:">
                <SynchronizedAutoSwitch
                  obj={device}
                  getOnObject={d => d.shouldSendNotification}
                  setOnObject={(d, value) => {
                    d.shouldSendNotification = value;
                  }}
                  processTap={value =>
                    savesOnNode(
                      () => setDeviceNotificationPolicy(device.id, value),
                      `Notifications turned ${onOff(value)}.`,
                      `Notifications failed to turn ${onOff(value)}.`,
                    )
                  }
                />
              </SwitchRow>
              <RowDivider />

              <SwitchRow label="Receive Connection Notifications:">
                <SynchronizedAutoSwitch
                  obj={device}
                  getOnObject={d => d.shouldSendConnectionNotification}
                  setOnObject={(d, value) => {
                    d.shouldSendConnectionNotification = value;
                  }}
                  processTap={value =>
                    savesOnNode(
                      () =>
                        setDeviceConnectionNotificationPolicy(device.id, value),
                      `Notifications turned ${onOff(value)}.`,
                      `Notifications failed to turn ${onOff(value)}.`,
                    )
                  }
                />
              </SwitchRow>
              <RowDivider />

              <SwitchRow label="Receive Email Notifications:">
                <SynchronizedAutoSwitch
                  obj={device}
                  getOnObject={d => d.shouldSendEmail}
                  setOnObject={(d, value) => {
                    d.shouldSendEmail = value;
                  }}
                  processTap={value =>
                    savesOnNode(
                      () => setDeviceEmailNotificationPolicy(device.id, value),
                      `Email notifications turned ${onOff(value)}.`,
                      `Email notifications failed to turn ${onOff(value)}.`,
                    )
                  }
                />
              </SwitchRow>
              <RowDivider />
            </ScrollView>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

/**
 * Padding(20 across, 2 down) → Row(spaceBetween)[Flexible(label), 10, switch], with `below` under
 * the row (the integrator row's Column).
 */
function SwitchRow({
  label,
  below,
  children,
}: {
  label: string;
  below?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.rowPadding}>
      <View style={styles.row}>
        <View style={styles.flexible}>
          <Text style={labelText}>{label}</Text>
        </View>
        <View style={styles.gap10} />
        {children}
      </View>
      {below}
    </View>
  );
}

/** Padding(20 across, 1 down) → Divider(white60, 1). */
function RowDivider() {
  return (
    <View style={styles.rowDivider}>
      <Divider color={MaterialColors.white60} thickness={1} />
    </View>
  );
}

const labelText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 16 })),
  includeFontPadding: false,
};
const nameText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 30 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
  paddingBottom: 15,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  backRow: { paddingLeft: 10, alignItems: 'flex-start' },
  glyphPadding: { padding: 10 },
  firstDivider: { paddingLeft: 20, paddingTop: 15, paddingRight: 20 },
  rowPadding: { paddingHorizontal: 20, paddingVertical: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexible: { flexShrink: 1 },
  gap10: { width: 10 },
  pairColumn: { alignItems: 'center' },
  gap10Tall: { height: 10 },
  rowDivider: { paddingHorizontal: 20, paddingVertical: 1 },
});
