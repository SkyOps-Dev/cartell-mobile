// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/failure_widget.dart: the error
// outcome (unnumbered).
//
// wifi_off (150, white), then the message as the title and the detail (if any) under it. With
// `firstTime` (never set in Flutter, quirk Q38) a note follows, padded 30 above and 20 below.
// "Begin Pairing Again" (amber, FA rss) → step 1. 10, "Error: <code>" (15, Gravel). Exit: "Return
// to Devices".

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import {
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import { BeginPairingHubEvent } from '../events/hubSetupEvents';
import { useReadHubConnectionBloc } from '../HubConnectionBlocContext';
import { pairingText } from './pairingText';

type Props = {
  /** The headline. */
  message: string;
  code: string;
  firstTime?: boolean;
  /** Explanation under the headline. */
  detail?: string | null;
};

export function FailureWidget({
  message,
  code,
  firstTime = false,
  detail,
}: Props) {
  return (
    <PairingStepScaffold
      exitLabel="Return to Devices"
      heroLeads
      title={message}
      subtitle={detail}
      hero={
        <Icon icon={Icons.wifi_off} size={150} color={MaterialColors.white} />
      }
    >
      {firstTime && (
        <View style={styles.firstTimePadding}>
          <Text style={firstTimeText}>
            Your Hub is added to your account. To connect, tap Return, then tap
            your hub, and tap Connect Hub.
          </Text>
        </View>
      )}
      <BeginPairingAgainButton />
      <View style={styles.gap10} />
      <Text style={codeText}>{`Error: ${code}`}</Text>
    </PairingStepScaffold>
  );
}

/** Reads the bloc on tap, as Flutter does: the page also opens from Add Hub, with no bloc above. */
function BeginPairingAgainButton() {
  const readBloc = useReadHubConnectionBloc();
  return (
    <RoundedButton
      onPressed={() => {
        readBloc().add(new BeginPairingHubEvent());
      }}
      icon={FontAwesomeIcons.rss}
      iconColor={MaterialColors.black}
      title="Begin Pairing Again"
      buttonColor={kCartellYellow}
      buttonTitleColor={MaterialColors.black}
    />
  );
}

const firstTimeText = pairingText({}, 'center');
const codeText = pairingText(
  { fontSize: 15, color: kCartellLightGray },
  'center',
);

const styles = StyleSheet.create({
  firstTimePadding: { paddingTop: 30, paddingBottom: 20 },
  gap10: { height: 10 },
});
