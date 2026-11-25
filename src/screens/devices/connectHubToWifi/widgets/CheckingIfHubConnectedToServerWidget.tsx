// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/checking_if_hub_connected_to_server_widget.dart:
// step 6 while the server is asked whether the hub is online, "Checking Hub's connection...".
//
// Hero: the four-dot spinner (white). Under it, why we are still waiting (an icon at 20 and the
// label at 17, both Gravel, side by side, wrapping onto two lines when they do not fit), 10, then
// "m:ss elapsed" (14, Gravel), counted every second from the poll's start, and from one minute on
// "This can take a few minutes." 10 below it. Once the trip to the hub's own network found
// nothing, the hub light readings follow, 25 below, and stay. Exit: "Cancel" (Back and the button
// both ask nothing here: Cancel settles the wait as "Pairing stopped").

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../../components/icons/Icon';
import { IconData, Icons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { SpinKitFadingFour } from '../../../../components/progress/SpinKitFadingFour';
import { kCartellLightGray, MaterialColors } from '../../../../theme/colors';
import { WaitingReason } from '../hubRegistrationCheck';
import { HubLightReadings } from './HubLightReadings';
import { pairingText } from './pairingText';

const reasonLabels: Record<WaitingReason, string> = {
  [WaitingReason.rejoiningNetwork]:
    'Reconnecting your phone to your wifi network.',
  [WaitingReason.waitingForHub]: 'Waiting for your hub to reach our servers.',
  [WaitingReason.reachingServer]:
    'Having trouble reaching Cartell. Still trying.',
  [WaitingReason.checkingHub]: 'Checking on your hub.',
  [WaitingReason.hubNotAnswering]: 'Still waiting for your hub.',
};

/** An icon per reason, so the state never depends on colour alone. */
const reasonIcons: Record<WaitingReason, IconData> = {
  [WaitingReason.rejoiningNetwork]: Icons.sync,
  [WaitingReason.waitingForHub]: Icons.router,
  [WaitingReason.reachingServer]: Icons.wifi_off,
  [WaitingReason.checkingHub]: Icons.travel_explore,
  [WaitingReason.hubNotAnswering]: Icons.lightbulb_outline,
};

type Props = {
  /** When the poll began (ms since the epoch). */
  startedAt: number;
  reason: WaitingReason;
  showLightReadings?: boolean;
};

export function CheckingIfHubConnectedToServerWidget({
  startedAt,
  reason,
  showLightReadings = false,
}: Props) {
  return (
    <PairingStepScaffold
      title="Checking Hub's connection..."
      exitLabel="Cancel"
      hero={<SpinKitFadingFour color={MaterialColors.white} />}
    >
      <View style={styles.reason}>
        <Icon icon={reasonIcons[reason]} size={20} color={kCartellLightGray} />
        <Text style={reasonText}>{reasonLabels[reason]}</Text>
      </View>
      <View style={styles.gap10} />
      <ElapsedNotice startedAt={startedAt} />
      {showLightReadings && (
        <>
          <View style={styles.gap25} />
          <HubLightReadings />
        </>
      )}
    </PairingStepScaffold>
  );
}

/** The clock-driven part, ticking every second without redrawing the rest of the screen. */
function ElapsedNotice({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const total = Math.floor((now - startedAt) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return (
    <View style={styles.elapsed}>
      <Text style={labelText}>{`${minutes}:${seconds} elapsed`}</Text>
      {total >= 60 && (
        <>
          <View style={styles.gap10} />
          <Text style={centredLabelText}>This can take a few minutes.</Text>
        </>
      )}
    </View>
  );
}

const reasonText = pairingText(
  { fontSize: 17, color: kCartellLightGray },
  'center',
);
const labelText = pairingText({ fontSize: 14, color: kCartellLightGray });
const centredLabelText = pairingText(
  { fontSize: 14, color: kCartellLightGray },
  'center',
);

const styles = StyleSheet.create({
  // Wrap(alignment: center, crossAxisAlignment: center, spacing 10, runSpacing 5).
  reason: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 10,
    rowGap: 5,
  },
  elapsed: { alignItems: 'center' },
  gap10: { height: 10 },
  gap25: { height: 25 },
});
