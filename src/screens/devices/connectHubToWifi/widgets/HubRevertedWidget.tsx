// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/hub_reverted_widget.dart: the
// hub answered on its own network, so it did not join. The one failure stated without hedging,
// but without naming which cause (a wrong password, out of range, the router down).
//
// The hub light playing Wi-Fi Pairing Mode, "Your hub could not join that network", "It went back
// to waiting for setup, so the details it was given did not work." Three things to check, in
// likelihood order (a 6 Gravel dot 6 down and 10 before each, the text at 17, 10 below each), 20,
// "Try Again" (amber, FA rotateRight) → step 1. Exit: "Return to Devices".

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import {
  hubLightWifiAccessPointMode,
  HubLightWidget,
} from '../../../../components/HubLightWidget';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import {
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import { BeginPairingHubEvent } from '../events/hubSetupEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';
import { pairingText } from './pairingText';

const thingsToCheck = [
  'The Wi-Fi password, which is the usual cause.',
  'That the hub is close enough to your router.',
  'That your router is powered on and its network is up.',
];

export function HubRevertedWidget() {
  const bloc = useHubConnectionBloc();
  return (
    <PairingStepScaffold
      heroLeads
      title="Your hub could not join that network"
      subtitle={
        'It went back to waiting for setup, so the details it was given ' +
        'did not work.'
      }
      hero={
        <HubLightWidget
          pattern={hubLightWifiAccessPointMode.pattern}
          semanticLabel={hubLightWifiAccessPointMode.name}
        />
      }
      exitLabel="Return to Devices"
    >
      <View style={styles.list}>
        {thingsToCheck.map(item => (
          <View key={item} style={styles.item}>
            <View style={styles.bullet}>
              <Icon icon={Icons.circle} size={6} color={kCartellLightGray} />
            </View>
            <Text style={[styles.flex, itemText]}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.gap20} />
      <RoundedButton
        onPressed={() => {
          bloc.add(new BeginPairingHubEvent());
        }}
        title="Try Again"
        icon={FontAwesomeIcons.rotateRight}
        iconColor={MaterialColors.black}
        buttonColor={kCartellYellow}
        buttonTitleColor={MaterialColors.black}
      />
    </PairingStepScaffold>
  );
}

const itemText = pairingText({ fontSize: 17 });

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch' },
  item: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { paddingTop: 6, paddingRight: 10 },
  flex: { flex: 1 },
  gap20: { height: 20 },
});
