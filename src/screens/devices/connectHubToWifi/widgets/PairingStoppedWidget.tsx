// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/pairing_stopped_widget.dart:
// the user stopped waiting for the hub. Not a failure screen: pairing was never shown to have
// failed, so the copy leads with the likelier outcome and leaving comes first.
//
// schedule (150, white), "Pairing stopped", "Your hub may already be connected.\nCheck your
// Devices list before pairing again." Exit first: "Return to Devices". Then "Begin Pairing Again"
// (blue, not amber: nothing here completes pairing; FA rss) → step 1, 10, "Code: e5b1907d-C" (14,
// Gravel).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import {
  kCartellBlue,
  kCartellLightGray,
  MaterialColors,
} from '../../../../theme/colors';
import { BeginPairingHubEvent } from '../events/hubSetupEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';
import { HubRegistrationErrorCodes } from '../pairingErrorCodes';
import { pairingText } from './pairingText';

export function PairingStoppedWidget() {
  const bloc = useHubConnectionBloc();
  return (
    <PairingStepScaffold
      exitLabel="Return to Devices"
      exitLeads
      heroLeads
      title="Pairing stopped"
      subtitle={
        'Your hub may already be connected.\n' +
        'Check your Devices list before pairing again.'
      }
      hero={
        <Icon icon={Icons.schedule} size={150} color={MaterialColors.white} />
      }
    >
      <RoundedButton
        onPressed={() => {
          bloc.add(new BeginPairingHubEvent());
        }}
        icon={FontAwesomeIcons.rss}
        iconColor={MaterialColors.black}
        title="Begin Pairing Again"
        buttonColor={kCartellBlue}
        buttonTitleColor={MaterialColors.black}
      />
      <View style={styles.gap10} />
      <Text style={codeText}>
        {`Code: ${HubRegistrationErrorCodes.cancelledWhileWaiting}`}
      </Text>
    </PairingStepScaffold>
  );
}

const codeText = pairingText(
  { fontSize: 14, color: kCartellLightGray },
  'center',
);

const styles = StyleSheet.create({ gap10: { height: 10 } });
