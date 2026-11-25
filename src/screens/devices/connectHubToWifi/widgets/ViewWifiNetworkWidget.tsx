// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/view_wifi_network_widget.dart:
// step 6, "Login To WiFi Network".
//
// Hero: the network's signal glyph (150, white) over a full one in Deep Gravel, padded 8. Then
// "Name" and the network's name; in debug builds also "RSSI" ("<rssi> db") and "Scan QR Code
// Password - Debug Only" (blue), which fills the field from a scanned code.
// The password field (hint "Enter network password", hidden, no autofill, suggestions or
// autocorrect: it is the home Wi-Fi key, not this app's login) and the show/hide eye beside it.
// As the user types, a password too long for the hub's 64-byte field is refused (the error under
// the field, up to 3 lines) and "Connect" turns off.
// 15, "Connect" (amber): with a password, the details go to the hub; with none, "Connect without a
// password?" first (Go back / Connect anyway). "Back to networks" (blue) starts a new scan.
// No exit button (Back asks "Stop Pairing?").

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '../../../../components/buttons/IconButton';
import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { UnderlineTextField } from '../../../../components/forms/UnderlineTextField';
import { scanQrCode } from '../../../../components/forms/QrScanner';
import { Icon } from '../../../../components/icons/Icon';
import { Icons } from '../../../../components/icons/iconData';
import { KeyValuePairDisplay } from '../../../../components/KeyValuePairDisplay';
import { kListTileIconColor } from '../../../../components/lists/ListTile';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import {
  popPopup,
  showPopupMessage,
} from '../../../../components/popups/popups';
import { Encryption } from '../../../../services/encryption';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellDarkGray,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import type { ScanWifiNetworksReply } from '../../../../udpCommands/commands';
import { RefreshHubWifiNetworksEvent } from '../events/wifiNetworkEvents';
import { ConnectHubToWifiEvent } from '../events/wifiConnectionEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';
import { rssiIcon } from '../utilities';

/** No character count: a password long enough to fail is carrying multi-byte characters. */
const tooLongMessage =
  'This password is too long for the hub, which stores 64 ' +
  'characters. Accented and emoji characters use more than one ' +
  'each.';

export function ViewWifiNetworkWidget({
  network,
}: {
  network: ScanWifiNetworksReply;
}) {
  const bloc = useHubConnectionBloc();
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const onChangeText = (value: string) => {
    setPassword(value);
    setPasswordError(
      Encryption.fieldBytesRemaining(value) >= 0 ? null : tooLongMessage,
    );
  };

  const connect = () => {
    bloc.add(new ConnectHubToWifiEvent(network, password));
  };

  return (
    <PairingStepScaffold
      title="Login To WiFi Network"
      hero={
        <View style={styles.heroPadding}>
          <Icon icon={rssiIcon(10)} size={150} color={kCartellDarkGray} />
          <View style={[StyleSheet.absoluteFill, styles.heroPadding]}>
            <Icon
              icon={rssiIcon(network.rssi)}
              size={150}
              color={MaterialColors.white}
            />
          </View>
        </View>
      }
    >
      <View style={styles.stretch}>
        <KeyValuePairDisplay keyStr="Name" valueStr={network.ssid} />
      </View>
      {__DEV__ && (
        <View style={styles.stretch}>
          <KeyValuePairDisplay keyStr="RSSI" valueStr={`${network.rssi} db`} />
        </View>
      )}
      {__DEV__ && (
        <RoundedButton
          onPressed={() => {
            scanQrCode({
              title: 'Scan WiFi Password',
              loadingPrompt: 'Find QR WiFi Password',
              returnPrompt: 'Use WiFi Password',
              // Setting the controller's text does not run onChanged, so no length check.
              // The whole QR text, unparsed: a Wi-Fi QR's "WIFI:…;P:" and ";;" come along (Q58).
              returnBarcode: barcode => setPassword(barcode),
            });
          }}
          buttonTitleColor={kCartellBlack}
          buttonColor={kCartellBlue}
          title="Scan QR Code Password - Debug Only"
        />
      )}
      <View style={styles.passwordRow}>
        <View style={styles.flex}>
          <UnderlineTextField
            testID="wifi-password"
            value={password}
            onChangeText={onChangeText}
            hintText="Enter network password"
            errorText={passwordError}
            errorMaxLines={3}
            obscureText={hidePassword}
            noAutofill
          />
        </View>
        <IconButton
          icon={hidePassword ? Icons.visibility : Icons.visibility_off}
          size={20}
          color={kListTileIconColor}
          onPressed={() => setHidePassword(hidden => !hidden)}
        />
      </View>
      <View style={styles.gap15} />
      <RoundedButton
        onPressed={
          passwordError !== null
            ? null
            : () => {
                if (password.length > 0) {
                  connect();
                  return;
                }
                showPopupMessage({
                  title: 'Connect without a password?',
                  message:
                    `${network.ssid} will be ` +
                    'joined as an open network, so anyone nearby ' +
                    'can see the traffic between your hub and your ' +
                    'router.',
                  okayButtonLabel: 'Go back',
                  cancelButtonLabel: 'Connect anyway',
                  onCancel: () => {
                    popPopup();
                    connect();
                  },
                });
              }
        }
        buttonTitleColor={kCartellBlack}
        buttonColor={kCartellYellow}
        title="Connect"
      />
      <RoundedButton
        onPressed={() => {
          bloc.add(new RefreshHubWifiNetworksEvent());
        }}
        buttonTitleColor={kCartellBlack}
        buttonColor={kCartellBlue}
        title="Back to networks"
      />
    </PairingStepScaffold>
  );
}

const styles = StyleSheet.create({
  heroPadding: { padding: 8 },
  stretch: { alignSelf: 'stretch' },
  passwordRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex: { flex: 1 },
  gap15: { height: 15 },
});
