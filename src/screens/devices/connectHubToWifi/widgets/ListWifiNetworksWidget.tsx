// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/list_wifi_networks_widget.dart:
// step 5, "Select WiFi Network".
//
// Hero: wifi (125, white). Between two dividers (white60, padded 20 across), the networks the hub
// reports, redrawn as each arrives:
// - none yet, for 8 s after a scan starts: the ring spinner (amber) and "Looking for networks..."
//   (14, Gravel), 25 / 20 / 25 around them;
// - none after that: wifi_find (60, Gravel), "No networks found" (17, w700) and why (14, Gravel),
//   padded 25 down;
// - otherwise one row each (a ListTile: the name at 17, the signal glyph at 20 drawn over a full
//   one in Deep Gravel at the end) → the password step.
// A refresh starts a new scan (the bloc's scanGeneration) and the 8 s window again. Then the
// 2.4 GHz note (14, Gravel, padded 14 across, 25 above and below) and "Refresh Wifi Networks"
// (blue, no icon). Exit: "Cancel".

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { Icons } from '../../../../components/icons/iconData';
import { Divider } from '../../../../components/lists/Divider';
import {
  kListTileIconColor,
  ListTile,
} from '../../../../components/lists/ListTile';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { SpinKitRing } from '../../../../components/progress/SpinKitRing';
import type { ScanWifiNetworksReply } from '../../../../udpCommands/commands';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellDarkGray,
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import {
  RefreshHubWifiNetworksEvent,
  SelectWifiNetworkEvent,
} from '../events/wifiNetworkEvents';
import type { HubConnectionBloc } from '../hubConnectionBloc';
import { useWatchHubConnectionBloc } from '../HubConnectionBlocContext';
import { rssiIcon } from '../utilities';
import { pairingText } from './pairingText';

const SCAN_SETTLE_MS = 8000;

/**
 * Whether an empty list now means "none found" rather than "still looking": 8 s after the scan
 * the list belongs to started. Display only; the bloc reports no end of scan.
 */
function useScanSettled(scanGeneration: number): boolean {
  const [settledGeneration, setSettledGeneration] = useState<number | null>(
    null,
  );
  useEffect(() => {
    const timer = setTimeout(
      () => setSettledGeneration(scanGeneration),
      SCAN_SETTLE_MS,
    );
    return () => clearTimeout(timer);
  }, [scanGeneration]);
  return settledGeneration === scanGeneration;
}

export function ListWifiNetworksWidget() {
  const [bloc] = useWatchHubConnectionBloc();
  const scanSettled = useScanSettled(bloc.scanGeneration);
  return (
    <PairingStepScaffold
      title="Select WiFi Network"
      exitLabel="Cancel"
      subtitle={
        'Choose the Wi-Fi network you want your hub to use. ' +
        'It must be a 2.4GHz network.'
      }
      hero={<Icon icon={Icons.wifi} size={125} color={MaterialColors.white} />}
    >
      <View style={styles.dividerPadding}>
        <Divider color={MaterialColors.white60} thickness={1} />
      </View>
      <View style={styles.stretch}>
        <WifiList bloc={bloc} scanSettled={scanSettled} />
      </View>
      <View style={styles.dividerPadding}>
        <Divider color={MaterialColors.white60} thickness={1} />
      </View>
      <View style={styles.gap25} />
      <View style={styles.textPadding}>
        <Text style={noteText}>
          {'If your network does not appear in the list, it may not be a ' +
            '2.4GHz network. Please check your router settings and ensure ' +
            'your network is set to 2.4GHz.'}
        </Text>
      </View>
      <View style={styles.gap25} />
      <RoundedButton
        onPressed={() => {
          bloc.add(new RefreshHubWifiNetworksEvent());
        }}
        title="Refresh Wifi Networks"
        buttonColor={kCartellBlue}
        buttonTitleColor={kCartellBlack}
      />
    </PairingStepScaffold>
  );
}

function WifiList({
  bloc,
  scanSettled,
}: {
  bloc: HubConnectionBloc;
  scanSettled: boolean;
}) {
  const networks = bloc.wifiNetworks;
  if (networks.size === 0 && !scanSettled) {
    return (
      <View style={styles.centred}>
        <View style={styles.gap25} />
        <SpinKitRing color={kCartellYellow} />
        <View style={styles.gap20} />
        <Text style={lookingText}>Looking for networks...</Text>
        <View style={styles.gap25} />
      </View>
    );
  }
  if (networks.size === 0) {
    return (
      <View style={[styles.centred, styles.noneFound]}>
        <Icon icon={Icons.wifi_find} size={60} color={kCartellLightGray} />
        <View style={styles.gap15} />
        <Text style={noneTitleText}>No networks found</Text>
        <View style={styles.gap10} />
        <Text style={noneBodyText}>
          {'Your hub can only see 2.4GHz networks. Check your router ' +
            'settings, then scan again.'}
        </Text>
      </View>
    );
  }
  return (
    <>
      {[...networks.values()].map((network, i) => (
        <NetworkCard
          // Flutter's list builder keys rows by position.
          key={i}
          network={network}
          onTap={() => bloc.add(new SelectWifiNetworkEvent(network))}
        />
      ))}
    </>
  );
}

/** A ListTile: 48 dp or more, the press ripple, the button role, the signal glyph at the end. */
function NetworkCard({
  network,
  onTap,
}: {
  network: ScanWifiNetworksReply;
  onTap: () => void;
}) {
  return (
    <ListTile
      title={network.ssid}
      titleStyle={networkTitleStyle}
      onTap={onTap}
      trailing={
        <View>
          <Icon icon={rssiIcon(10)} size={20} color={kCartellDarkGray} />
          <View style={StyleSheet.absoluteFill}>
            <Icon
              icon={rssiIcon(network.rssi)}
              size={20}
              color={kListTileIconColor}
            />
          </View>
        </View>
      }
    />
  );
}

/** The row title's own TextStyle(fontSize: 17), merged over the tile's. */
const networkTitleStyle = { fontSize: 17 };
const noteText = pairingText(
  { fontSize: 14, color: kCartellLightGray },
  'center',
);
const lookingText = pairingText({ fontSize: 14, color: kCartellLightGray });
const noneTitleText = pairingText({ fontSize: 17, fontWeight: '700' });
const noneBodyText = pairingText(
  { fontSize: 14, color: kCartellLightGray },
  'center',
);

const styles = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
  dividerPadding: { alignSelf: 'stretch', paddingHorizontal: 20 },
  textPadding: { paddingHorizontal: 14 },
  centred: { alignItems: 'center' },
  noneFound: { paddingVertical: 25 },
  gap10: { height: 10 },
  gap15: { height: 15 },
  gap20: { height: 20 },
  gap25: { height: 25 },
});
