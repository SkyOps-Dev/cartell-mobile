// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/intitial_connection_widget.dart:
// step 4, "Connect to Your Hub".
//
// Hero: wifi (125, white). "Before you press the button, have your Wi-Fi password ready. Please
// ensure your network is 2.4GHz before proceeding." (16, padded 14 across), 20. On Android, Wi-Fi
// is read on opening and whenever the app comes back to the foreground; while it is off, a warning
// box (amber at 0.15 on an amber border, radius 8, padded 12, 14 in from each side, 20 below:
// wifi_off in amber, 12, the text in amber 14) and "Connect to Hub" is off. iOS never checks.
// "Connect to Hub" (amber, FA rss) → joins the hub's network. Help (the FAB): "Connecting to Your
// Hub". Exit: "Cancel".

import React, { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { showPopupMessage } from '../../../../components/popups/popups';
import { WiFiForIoTPlugin } from '../../../../services/wifiIot';
import {
  kCartellBlack,
  kCartellYellow,
  MaterialColors,
  withOpacity,
} from '../../../../theme/colors';
import { StartConnectionEvent } from '../events/hubConnectionEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';
import { pairingText } from './pairingText';

function showHelpDialog() {
  showPopupMessage({
    title: 'Connecting to Your Hub',
    message:
      'Press "Connect to Hub" and your phone will ask permission to ' +
      'join a temporary network named "Cartell Hub" followed by your ' +
      "hub's Mac Address. Confirm when your phone asks.\n\n" +
      'Your phone leaves your home Wi-Fi while it hands the hub your ' +
      'network details, then rejoins on its own once setup finishes.\n\n' +
      'If no permission request appears, check that Wi-Fi is on and ' +
      "that your hub's light is still blinking.",
    okayButtonLabel: 'Got it',
  });
}

/** Whether Wi-Fi is on (Android only; true until known, so no warning flashes). */
function useWifiEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (Platform.OS === 'android') {
        const on = await WiFiForIoTPlugin.isEnabled();
        if (mounted) {
          setEnabled(on);
        }
      }
    };
    check();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
      }
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}

export function InitialConnectionWidget() {
  const bloc = useHubConnectionBloc();
  const isWifiEnabled = useWifiEnabled();
  return (
    <PairingStepScaffold
      exitLabel="Cancel"
      title="Connect to Your Hub"
      subtitle="Connect to the WiFi signal of the HUB."
      hero={<Icon icon={Icons.wifi} size={125} color={MaterialColors.white} />}
      help={showHelpDialog}
    >
      <View style={styles.textPadding}>
        <Text style={bodyText}>
          {'Before you press the button, have your Wi-Fi password ready. ' +
            'Please ensure your network is 2.4GHz before proceeding. '}
        </Text>
      </View>
      <View style={styles.gap20} />
      {!isWifiEnabled && (
        <View style={styles.warningPadding}>
          <View style={styles.warning}>
            <Icon icon={Icons.wifi_off} color={kCartellYellow} />
            <View style={styles.gap12} />
            <Text style={[styles.flex, warningText]}>
              Your WiFi is turned off. Please enable WiFi to connect to your
              Hub.
            </Text>
          </View>
        </View>
      )}
      <RoundedButton
        onPressed={
          isWifiEnabled
            ? () => {
                bloc.add(new StartConnectionEvent());
              }
            : null
        }
        title="Connect to Hub"
        buttonTitleColor={MaterialColors.black}
        buttonColor={kCartellYellow}
        icon={FontAwesomeIcons.rss}
        iconColor={kCartellBlack}
      />
    </PairingStepScaffold>
  );
}

const bodyText = pairingText({ fontSize: 16 }, 'center');
const warningText = pairingText({ color: kCartellYellow, fontSize: 14 });

const styles = StyleSheet.create({
  textPadding: { paddingHorizontal: 14 },
  gap20: { height: 20 },
  gap12: { width: 12 },
  flex: { flex: 1 },
  warningPadding: { alignSelf: 'stretch', paddingBottom: 20 },
  warning: {
    marginHorizontal: 14,
    padding: 12,
    backgroundColor: withOpacity(kCartellYellow, 0.15),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: kCartellYellow,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
