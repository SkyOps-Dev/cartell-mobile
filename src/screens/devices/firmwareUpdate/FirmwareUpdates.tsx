// Port of frontend/lib/screens/devices/firmware_update/available_firmware_updates_screen.dart
// (spec 14 §2): a hub's firmware, what it runs now and what it can move to. Stateless: everything
// comes from the bloc state.
//
// AppScaffold → PopScope (Back → the hub's page) → Expanded → SafeArea → scroll → Column(stretch):
// - Padding(10, 10, 10, 5) → Row[← 'Back to hub', the hub's name (32, centred, 2 lines, ellipsis),
//   48 to balance the arrow]; 15;
// - "Current firmware" card: Controller (ESP32, blue microchip) and Transmitter (RFM6601, amber
//   tower) versions, side by side or stacked with big text (the 18 px scale above 1.4), then the
//   connection row; 10;
// - then one of: the running update ("View progress"), the offers ("Update now" behind the
//   "Update this hub?" popup, greyed while the hub is offline), or "Firmware is up to date"; 25.

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { RoundedButton } from '../../../components/buttons/RoundedButton';
import { IconButton } from '../../../components/buttons/IconButton';
import { Icon } from '../../../components/icons/Icon';
import {
  FontAwesomeIcons,
  type IconData,
} from '../../../components/icons/iconData';
import { AppScaffold } from '../../../components/layout/AppScaffold';
import { PopScope } from '../../../components/layout/PopScope';
import { SafeArea } from '../../../components/layout/SafeArea';
import { popPopup, showPopupMessage } from '../../../components/popups/popups';
import type { Device } from '../../../models/device';
import type { Firmware, FirmwareUpdate } from '../../../models/firmware';
import {
  GoToSpecificDeviceEvent,
  GoToUpdateDeviceFirmwareScreen,
} from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kActiveCardColor,
  kCartellAlertRed,
  kCartellBlue,
  kCartellDarkGray,
  kCartellLightGray,
  kCartellStatusGreen,
  kCartellYellow,
  kInactiveCardColor,
  MaterialColors,
} from '../../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../../theme/typography';
import { useBigFont } from '../../../utilities/scaling';

type Props = {
  device: Device;
  espUpdate: Firmware | null;
  rfmUpdate: Firmware | null;
  /** An update the server says is already running on this hub. */
  currentUpdate: FirmwareUpdate | null;
};

export function FirmwareUpdates({
  device,
  espUpdate,
  rfmUpdate,
  currentUpdate,
}: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  const stack = useBigFont(18);

  const availableUpdates = [espUpdate, rfmUpdate].filter(
    (firmware): firmware is Firmware => firmware !== null,
  );
  const running =
    currentUpdate !== null && currentUpdate.firmware !== null
      ? { update: currentUpdate, firmware: currentUpdate.firmware }
      : null;
  const isHubConnected = device.device.isConnected;

  const backToHub = () => {
    readDevicesBloc().add(new GoToSpecificDeviceEvent(device));
  };

  const confirmUpdate = (firmware: Firmware) => {
    showPopupMessage({
      title: 'Update this hub?',
      message:
        'This takes a few minutes. Keep the hub powered on and on WiFi. ' +
        'You can leave this screen while it runs, and the hub keeps its ' +
        'current firmware if the update fails.',
      okayButtonLabel: 'Update',
      onOkay: () => {
        popPopup();
        readDevicesBloc().add(
          new GoToUpdateDeviceFirmwareScreen(device, firmware),
        );
      },
      showCancel: true,
      cancelButtonLabel: 'Not now',
      onCancel: popPopup,
    });
  };

  // Side by side, each fills its half and the taller one's height (IntrinsicHeight + stretch).
  const fill = stack ? undefined : styles.flex;
  const controller = (
    <FirmwareVersionCard
      style={fill}
      title="Controller"
      version={device.device.esp32AppVersion}
      icon={FontAwesomeIcons.microchip}
      color={kCartellBlue}
    />
  );
  const transmitter = (
    <FirmwareVersionCard
      style={fill}
      title="Transmitter"
      version={device.device.rfm6601AppVersion}
      icon={FontAwesomeIcons.towerBroadcast}
      color={kCartellYellow}
    />
  );

  let offers: React.ReactNode;
  if (running !== null) {
    const isController = running.firmware.processor === 'ESP32';
    offers = (
      <View style={[styles.card, styles.cardPadding15]}>
        <SectionHeading
          text="Update in progress"
          icon={FontAwesomeIcons.arrowsRotate}
        />
        <View style={styles.gap10} />
        <Text style={detail}>
          {`${isController ? 'Controller' : 'Transmitter'} firmware is ` +
            `updating to v${running.firmware.versionNumber}. Keep the hub powered on.`}
        </Text>
        <View style={styles.gap10} />
        <View style={styles.start}>
          <RoundedButton
            buttonColor={kCartellYellow}
            buttonTitleColor={MaterialColors.black}
            iconColor={MaterialColors.black}
            icon={FontAwesomeIcons.eye}
            title="View progress"
            onPressed={() => {
              // Resume the existing update rather than POSTing a new one.
              readDevicesBloc().add(
                new GoToUpdateDeviceFirmwareScreen(
                  device,
                  running.firmware,
                  running.update.id,
                ),
              );
            }}
          />
        </View>
      </View>
    );
  } else if (availableUpdates.length > 0) {
    offers = (
      <>
        <View style={styles.offersHeading}>
          <SectionHeading
            text={
              availableUpdates.length === 1
                ? '1 update available'
                : `${availableUpdates.length} updates available`
            }
            icon={FontAwesomeIcons.cloudArrowUp}
          />
        </View>
        <View style={styles.gap5} />
        {availableUpdates.map(firmware => (
          <UpdateCard
            key={firmware.processor}
            firmware={firmware}
            device={device}
            isHubConnected={isHubConnected}
            onUpdate={() => confirmUpdate(firmware)}
          />
        ))}
      </>
    );
  } else {
    offers = (
      <View style={[styles.card, styles.upToDate]}>
        <Icon
          icon={FontAwesomeIcons.circleCheck}
          color={kCartellStatusGreen}
          size={40}
        />
        <View style={styles.gap10} />
        <Text style={upToDateTitle}>Firmware is up to date</Text>
        <View style={styles.gap5} />
        <Text style={upToDateDetail}>
          {isHubConnected
            ? 'Both components are running the latest versions.'
            : 'Both components were on the latest versions when the hub ' +
              'last checked in.'}
        </Text>
      </View>
    );
  }

  return (
    <AppScaffold
      body={
        <PopScope
          canPop
          onPopInvoked={popped => {
            if (popped) return;
            backToHub();
          }}
        >
          <SafeArea style={styles.expanded}>
            <ScrollView
              style={styles.expanded}
              contentContainerStyle={styles.column}
            >
              <View style={styles.header}>
                <IconButton
                  icon={FontAwesomeIcons.arrowLeftLong}
                  color={ColorScheme.onSurfaceVariant}
                  tooltip="Back to hub"
                  onPressed={backToHub}
                />
                <Text
                  style={[name, styles.headerName]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {device.name}
                </Text>
                <View style={styles.balance} />
              </View>
              <View style={styles.gap15} />
              <View style={[styles.card, styles.cardPadding15]}>
                <SectionHeading
                  text="Current firmware"
                  icon={FontAwesomeIcons.microchip}
                />
                <View style={styles.gap15} />
                {stack ? (
                  <View>
                    {controller}
                    <View style={styles.gap10} />
                    {transmitter}
                  </View>
                ) : (
                  <View style={styles.versionRow}>
                    {controller}
                    <View style={styles.width10} />
                    {transmitter}
                  </View>
                )}
                <View style={styles.gap15} />
                <ConnectionRow connected={isHubConnected} />
              </View>
              <View style={styles.gap10} />
              {offers}
              <View style={styles.gap25} />
            </ScrollView>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

function SectionHeading({ text, icon }: { text: string; icon: IconData }) {
  return (
    <View style={styles.row}>
      <Icon icon={icon} color={kCartellYellow} size={20} />
      <View style={styles.width10} />
      <Text style={[heading, styles.flex]}>{text}</Text>
    </View>
  );
}

/** Connectivity, because the versions above are last-known values. */
function ConnectionRow({ connected }: { connected: boolean }) {
  const color = connected ? kCartellYellow : kCartellAlertRed;
  return (
    <View style={styles.connectionRow}>
      <Icon
        icon={
          connected
            ? FontAwesomeIcons.towerBroadcast
            : FontAwesomeIcons.circleExclamation
        }
        color={color}
        size={16}
      />
      <View style={styles.width10} />
      <Text style={[connection, { color }, styles.flex]}>
        {connected
          ? 'HUB connected'
          : 'HUB offline — versions shown are the last we heard'}
      </Text>
    </View>
  );
}

function FirmwareVersionCard({
  style,
  title,
  version,
  icon,
  color,
}: {
  style?: ViewStyle;
  title: string;
  version: number | null;
  icon: IconData;
  color: string;
}) {
  return (
    <View style={[styles.versionCard, { borderColor: color }, style]}>
      <View style={styles.row}>
        <Icon icon={icon} color={color} size={16} />
        <View style={styles.width5} />
        <Text style={[label, styles.flex]}>{title}</Text>
      </View>
      <View style={styles.gap5} />
      <Text style={version20}>
        {version === null ? 'Not reported' : `v${version}`}
      </Text>
    </View>
  );
}

function UpdateCard({
  firmware,
  device,
  isHubConnected,
  onUpdate,
}: {
  firmware: Firmware;
  device: Device;
  isHubConnected: boolean;
  onUpdate: () => void;
}) {
  const isController = firmware.processor === 'ESP32';
  const color = isController ? kCartellBlue : kCartellYellow;
  const current = isController
    ? device.device.esp32AppVersion
    : device.device.rfm6601AppVersion;
  return (
    <View style={[styles.card, styles.cardPadding15]}>
      <View style={styles.row}>
        <Icon
          icon={
            isController
              ? FontAwesomeIcons.microchip
              : FontAwesomeIcons.towerBroadcast
          }
          color={color}
          size={20}
        />
        <View style={styles.width10} />
        <View style={styles.flex}>
          <Text style={cardTitle}>
            {isController ? 'Controller firmware' : 'Transmitter firmware'}
          </Text>
          <View style={styles.gap5} />
          <Text style={label}>
            {`v${current ?? '?'} → v${firmware.versionNumber}`}
          </Text>
        </View>
      </View>
      <View style={styles.gap10} />
      <View style={styles.start}>
        <RoundedButton
          buttonColor={color}
          buttonTitleColor={MaterialColors.black}
          iconColor={MaterialColors.black}
          icon={FontAwesomeIcons.download}
          title="Update now"
          onPressed={isHubConnected ? onUpdate : null}
        />
      </View>
      {!isHubConnected && (
        <View style={styles.reconnect}>
          <Text style={label}>Reconnect the hub before updating.</Text>
        </View>
      )}
    </View>
  );
}

const text = (style: Parameters<typeof merge>[1]) => ({
  ...toRN(merge(ambientTextStyle, style)),
  includeFontPadding: false,
});
const name = { ...text({ fontSize: 32 }), textAlign: 'center' as const };
const heading = text({
  fontSize: 20,
  fontWeight: 'bold',
  color: MaterialColors.white,
});
const label = text({ fontSize: 14, color: kCartellLightGray });
const connection = text({ fontSize: 14 });
const version20 = text({
  fontSize: 20,
  fontWeight: 'bold',
  color: MaterialColors.white,
});
const cardTitle = text({
  fontSize: 17,
  fontWeight: 'bold',
  color: MaterialColors.white,
});
const detail = text({ fontSize: 17, color: kCartellLightGray });
const upToDateTitle = { ...heading, textAlign: 'center' as const };
const upToDateDetail = { ...detail, textAlign: 'center' as const };

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { alignItems: 'stretch' },
  header: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: { flex: 1 },
  balance: { width: 48 },
  card: {
    marginHorizontal: 20,
    marginVertical: 5,
    backgroundColor: kActiveCardColor,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: kCartellDarkGray,
  },
  cardPadding15: { padding: 15 },
  upToDate: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  offersHeading: { paddingHorizontal: 35 },
  row: { flexDirection: 'row', alignItems: 'center' },
  connectionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  versionRow: { flexDirection: 'row', alignItems: 'stretch' },
  versionCard: {
    padding: 10,
    backgroundColor: kInactiveCardColor,
    borderRadius: 10,
    borderWidth: 1,
  },
  start: { alignItems: 'flex-start' },
  reconnect: { paddingTop: 5 },
  flex: { flex: 1 },
  gap5: { height: 5 },
  gap10: { height: 10 },
  gap15: { height: 15 },
  gap25: { height: 25 },
  width5: { width: 5 },
  width10: { width: 10 },
});
