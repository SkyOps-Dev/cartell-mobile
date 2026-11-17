// Port of frontend/lib/screens/sensors/sensor_view.dart (spec 13 §3, features/18 and 19): one
// sensor's page, from its card on the Sensors list.
//
// AppScaffold with the ⋮ menu (PopupMenuButton, FA ellipsisVertical): Rename Sensor (pencil), Edit
// Coordinates (mapLocation), About (circleInfo), Delete Sensor (circleXmark; icon and title red).
// Each closes the menu first. Back and ← → the Sensors list (GoToSensorsScreenEvent).
// Body: Expanded → SafeArea → TimedPullToRefresh (pulled: the sensor fetched again, and "Last
// Updated" moves on) → scroll (always scrollable) → Padding(10 % of the width across once it is
// over 500) → Column (centred):
// - Padding(10, 0, 30, 0) → ← at the left;
// - SensorFlaggedBanner (a blacklisted sensor), whose Contact Support opens the Help screen;
// - the name (30, centred, 5 below);
// - Padding(15) → the picture 155 high (cartell_ct6.png for the onboard sensor, else Sensor.png);
// - not onboard: Padding(15 down) → the battery icon (none while "Checking...", FA batteryEmpty in
//   red accent when low, else FA batteryFull in green accent), and "Battery Status: Checking..."
//   (gravel) / "Low" / "Good";
// - ThreeButtonRow: Find Sensor (with coordinates: the maps app at them, labelled with the name; a
//   coordinate that is not a number shows "An error occurred.") or Set Location (Edit
//   Coordinates), View History, About;
// - Padding(20 across) → Divider (white60, 1);
// - Padding(20 across, 10 down) → Padding(20 across, 10 down) → Row[ "Receive Sensor
//   Notifications:" (16), 10, the switch ] (saved at once; "Notifications turned on." / "off.",
//   or "Notifications failed to turn on." / "off." and the switch goes back);
// - onboard: Padding(25 across) → Pair Sounder (amber, black, FA link): pair_to_sounder without
//   waiting, then at once the banner "Sent pairing message successfully", whatever the answer;
// - Padding(10 across, 20 down) → a sideways scroll → "Last Updated: " and the time the page was
//   built, moved on by each pull.
//
// The page keeps the sensor it was opened with (initState); a re-fetched sensor is the same
// object (the cache merges into it), so the page shows its new values when it redraws.
//
// Delete: the menu closes, then "Delete Sensor?" (Cancel, Delete). Delete sends the delete and,
// once it succeeds, closes the dialog and shows the Sensors list. A refusal shows nothing and the
// dialog stays (Q27). If the session check fails first, it acts as though the delete worked.
//
// On Node, with Django closed: opening the page, the pull, the switch, delete and Pair Sounder.

import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { SynchronizedAutoSwitch } from '../../components/forms/AutoSwitch';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import { ListTile } from '../../components/lists/ListTile';
import {
  popMenu,
  PopupMenuButton,
  PopupMenuItem,
} from '../../components/popups/PopupMenu';
import { popPopup, showPopupMessage } from '../../components/popups/popups';
import { showSuccess } from '../../components/popups/teastPopups';
import {
  onboardSensorImage,
  sensorImage,
} from '../../components/sensors/SensorCard';
import { ThreeButtonRow } from '../../components/threeButtonRows/ThreeButtonRow';
import { IconButtonRowEntry } from '../../components/threeButtonRows/IconButtonRowEntry';
import { TimedPullToRefresh } from '../../components/TimedPullToRefresh';
import type { Device } from '../../models/device';
import { dartDoubleTryParse } from '../../models/jsonParser';
import type { Sensor } from '../../models/sensor';
import { launchCoordinates } from '../../services/mapsLauncher';
import { reportError } from '../../services/reportError';
import { pairToSounder } from '../../services/requests/deviceRequests';
import {
  deleteSensor,
  setSensor,
  setSensorNotificationPolicy,
} from '../../services/requests/sensorRequests';
import { ResultOf } from '../../services/result';
import {
  GoToEditSensorLocationScreen,
  GoToEditSensorScreen,
  GoToSensorsScreenEvent,
  GoToSpecificSensorAboutScreen,
} from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import { RefreshState } from '../../state/genericBloc';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  kCartellBlack,
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { useLayoutWidth } from '../../utilities/layoutWidth';
import { formatDateAndTime } from '../../utilities/textFormatters';
import { SensorFlaggedBanner } from './SensorFlaggedBanner';

// Sensor.png is 345 × 355 and cartell_ct6.png 594 × 420, with no resolution variants.
const SENSOR_ASPECT = 345 / 355;
const ONBOARD_ASPECT = 594 / 420;

type Props = {
  device: Device;
  sensor: Sensor;
  isOnboardSensor: boolean;
  refresh?: RefreshState;
};

export function SensorView({
  device,
  sensor,
  isOnboardSensor,
  refresh = RefreshState.ready,
}: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  const [currentSensor, setCurrentSensor] = useState(sensor);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [width, onLayout] = useLayoutWidth();
  const columnPadding = { paddingHorizontal: width > 500 ? width * 0.1 : 0 };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Battery is hardware state, so it is not asserted from cache while the re-read is in flight.
  const isCheckingBattery = refresh === RefreshState.checking;

  const backToSensors = () => {
    readDevicesBloc().add(new GoToSensorsScreenEvent(device));
  };

  /** The pull. A failure is the uncaught error Flutter's Sentry would catch. */
  const refreshSensor = async () => {
    try {
      const fetched = await setSensor({
        deviceID: device.id,
        sensorID: sensor.id,
      });
      setCurrentSensor(fetched);
      setUpdatedAt(new Date());
    } catch (error) {
      reportError(error);
    }
  };

  const updateSensorData = () => {
    readDevicesBloc().add(new GoToEditSensorScreen(device, sensor));
    setCurrentSensor(sensor);
  };

  const updateSensorCoordinates = () => {
    readDevicesBloc().add(new GoToEditSensorLocationScreen(device, sensor));
    setCurrentSensor(sensor);
  };

  const pushAbout = () => {
    readDevicesBloc().add(new GoToSpecificSensorAboutScreen(device, sensor));
  };

  /** Deletes the sensor, then closes the dialog (Navigator.pop) and shows the Sensors list. */
  const removeSensor = async () => {
    await deleteSensor({ deviceID: device.id, sensorID: sensor.id });
    if (mounted.current) {
      popPopup();
      readDevicesBloc().add(new GoToSensorsScreenEvent(device));
    }
  };

  const deleteSensorDialog = () => {
    showPopupMessage({
      showCancel: true,
      title: 'Delete Sensor?',
      message: 'Are you sure you want to delete this Sensor?',
      okayButtonLabel: 'Delete',
      onOkay: () => {
        removeSensor().catch(reportError);
      },
    });
  };

  const findSensor = () => {
    // double.parse throws on anything that is not a number; the launch itself is not awaited.
    const latitude = dartDoubleTryParse(currentSensor.latitude);
    const longitude = dartDoubleTryParse(currentSensor.longitude);
    if (latitude === null || longitude === null) {
      showPopupMessage({
        title: 'An error occurred.',
        message:
          'Could not find location. Please make sure you have set a location for this sensor. If the problem persists, please contact support.',
        onOkay: () => {
          popPopup();
        },
      });
      return;
    }
    launchCoordinates(latitude, longitude, currentSensor.name).catch(
      reportError,
    );
  };

  const findOrSetLocation = currentSensor.hasLatLong() ? (
    <IconButtonRowEntry
      onTap={findSensor}
      label="Find Sensor"
      iconData={FontAwesomeIcons.mapLocation}
    />
  ) : (
    <IconButtonRowEntry
      onTap={updateSensorCoordinates}
      label="Set Location"
      iconData={FontAwesomeIcons.mapLocation}
    />
  );

  return (
    <AppScaffold
      actions={
        <SensorMenu
          onRename={() => {
            popMenu();
            updateSensorData();
          }}
          onEditCoordinates={() => {
            popMenu();
            updateSensorCoordinates();
          }}
          onAbout={() => {
            popMenu();
            pushAbout();
          }}
          onDelete={() => {
            popMenu();
            deleteSensorDialog();
          }}
        />
      }
      body={
        <PopScope canPop onPopInvoked={backToSensors}>
          <SafeArea style={styles.expanded}>
            <TimedPullToRefresh
              onRefresh={refreshSensor}
              alwaysScrollable
              testID="sensor-page"
            >
              <View onLayout={onLayout} style={[styles.column, columnPadding]}>
                <View style={styles.backRow}>
                  <IconButton
                    icon={FontAwesomeIcons.arrowLeftLong}
                    color={ColorScheme.onSurfaceVariant}
                    onPressed={backToSensors}
                  />
                </View>
                <SensorFlaggedBanner
                  isBlacklisted={currentSensor.isBlacklisted}
                  onContactSupport={() => {
                    // PORT-GAP: context.read<MainAppBloc>().add(GoToContactUsScreen()) (the Help
                    // screen).
                  }}
                />
                <Text style={nameText}>{currentSensor.name}</Text>
                <View style={styles.picturePadding}>
                  <Image
                    source={isOnboardSensor ? onboardSensorImage : sensorImage}
                    fadeDuration={0}
                    resizeMethod="resize"
                    style={[
                      styles.picture,
                      {
                        aspectRatio: isOnboardSensor
                          ? ONBOARD_ASPECT
                          : SENSOR_ASPECT,
                      },
                    ]}
                  />
                </View>
                {!isOnboardSensor && (
                  <View style={styles.batteryPadding}>
                    {!isCheckingBattery && (
                      <Icon
                        icon={
                          currentSensor.hasLowBattery
                            ? FontAwesomeIcons.batteryEmpty
                            : FontAwesomeIcons.batteryFull
                        }
                        color={
                          currentSensor.hasLowBattery
                            ? MaterialColors.redAccent
                            : MaterialColors.greenAccent
                        }
                      />
                    )}
                  </View>
                )}
                {!isOnboardSensor && (
                  <Text
                    style={[
                      bodyText,
                      styles.centre,
                      isCheckingBattery && styles.checking,
                    ]}
                  >
                    {isCheckingBattery
                      ? 'Battery Status: Checking...'
                      : currentSensor.hasLowBattery
                      ? 'Battery Status: Low'
                      : 'Battery Status: Good'}
                  </Text>
                )}
                <ThreeButtonRow>
                  {[
                    findOrSetLocation,
                    <IconButtonRowEntry
                      key="history"
                      onTap={() => {
                        // PORT-GAP: GoToSensorHistoryEvent(device, sensor) (the sensor's events).
                      }}
                      label="View History"
                      iconData={Icons.router}
                    />,
                    <IconButtonRowEntry
                      key="about"
                      onTap={pushAbout}
                      label="About"
                      iconData={FontAwesomeIcons.circleInfo}
                    />,
                  ]}
                </ThreeButtonRow>
                <View style={styles.dividerPadding}>
                  <Divider color={MaterialColors.white60} thickness={1} />
                </View>
                <View style={styles.notificationsOuter}>
                  <View style={styles.notificationsInner}>
                    <Text style={[switchLabel, styles.flexible]}>
                      Receive Sensor Notifications:
                    </Text>
                    <View style={styles.gap10} />
                    <SynchronizedAutoSwitch
                      obj={currentSensor}
                      getOnObject={s => s.shouldSendNotification}
                      setOnObject={(s, value) => {
                        s.shouldSendNotification = value;
                      }}
                      processTap={async value => {
                        const offOrOnLabel = value ? 'on' : 'off';
                        try {
                          await setSensorNotificationPolicy(sensor.id, value);
                          return ResultOf.success(
                            `Notifications turned ${offOrOnLabel}.`,
                          );
                        } catch {
                          return ResultOf.failure({
                            message: `Notifications failed to turn ${offOrOnLabel}.`,
                          });
                        }
                      }}
                    />
                  </View>
                </View>
                {isOnboardSensor && (
                  <View style={styles.sounderPadding}>
                    <RoundedButton
                      title="Pair Sounder"
                      buttonColor={kCartellYellow}
                      buttonTitleColor={kCartellBlack}
                      icon={FontAwesomeIcons.link}
                      iconColor={kCartellBlack}
                      onPressed={() => {
                        // Not awaited, so Flutter's catch never sees a failure: the banner shows
                        // whatever the answer, and "Did not send pairing message" never does.
                        pairToSounder(device.id).catch(reportError);
                        showSuccess('Sent pairing message successfully', {
                          isMounted: () => mounted.current,
                        });
                      }}
                    />
                  </View>
                )}
                <View style={styles.lastUpdatedPadding}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.sideways}
                    contentContainerStyle={styles.sidewaysContent}
                  >
                    <Text style={bodyText}>{LAST_UPDATED}</Text>
                    <Text style={bodyText}>{formatDateAndTime(updatedAt)}</Text>
                  </ScrollView>
                </View>
              </View>
            </TimedPullToRefresh>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

/** The ⋮ menu. Each item closes the menu (Navigator.pop) before it acts. */
function SensorMenu({
  onRename,
  onEditCoordinates,
  onAbout,
  onDelete,
}: {
  onRename: () => void;
  onEditCoordinates: () => void;
  onAbout: () => void;
  onDelete: () => void;
}) {
  return (
    <PopupMenuButton
      icon={FontAwesomeIcons.ellipsisVertical}
      color={kAppBarActionsIconColor}
      itemBuilder={() => [
        <PopupMenuItem key="rename">
          <ListTile
            leadingIcon={FontAwesomeIcons.pencil}
            title="Rename Sensor"
            onTap={onRename}
          />
        </PopupMenuItem>,
        <PopupMenuItem key="coordinates">
          <ListTile
            leadingIcon={FontAwesomeIcons.mapLocation}
            title="Edit Coordinates"
            onTap={onEditCoordinates}
          />
        </PopupMenuItem>,
        <PopupMenuItem key="about">
          <ListTile
            leadingIcon={FontAwesomeIcons.circleInfo}
            title="About"
            onTap={onAbout}
          />
        </PopupMenuItem>,
        <PopupMenuItem key="delete">
          <ListTile
            leadingIcon={FontAwesomeIcons.circleXmark}
            leadingIconColor={MaterialColors.red}
            title="Delete Sensor"
            titleStyle={{ color: MaterialColors.red }}
            onTap={onDelete}
          />
        </PopupMenuItem>,
      ]}
    />
  );
}

// Its trailing space is part of the text.
const LAST_UPDATED = 'Last Updated: ';

const bodyText = { ...toRN(ambientTextStyle), includeFontPadding: false };
const nameText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 30 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
  paddingBottom: 5,
};
const switchLabel = {
  ...toRN(merge(ambientTextStyle, { fontSize: 16 })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { alignItems: 'center' },
  backRow: {
    alignSelf: 'stretch',
    paddingLeft: 10,
    paddingRight: 30,
    alignItems: 'flex-start',
  },
  picturePadding: { padding: 15 },
  picture: { height: 155 },
  batteryPadding: { paddingVertical: 15 },
  centre: { textAlign: 'center' },
  checking: { color: kCartellLightGray },
  dividerPadding: { alignSelf: 'stretch', paddingHorizontal: 20 },
  notificationsOuter: {
    alignSelf: 'stretch',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notificationsInner: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexible: { flexShrink: 1 },
  gap10: { width: 10 },
  sounderPadding: { paddingHorizontal: 25 },
  lastUpdatedPadding: {
    paddingHorizontal: 10,
    paddingVertical: 20,
    maxWidth: '100%',
  },
  sideways: { flexGrow: 0 },
  sidewaysContent: { flexDirection: 'row' },
});
