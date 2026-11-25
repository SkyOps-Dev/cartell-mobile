// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/connecting_to_hub_widget.dart:
// step 4 while the phone joins the hub's network, "Connecting to HUB".
//
// The system asks permission to join (Android's picker says Connect, iOS's alert Join) on top of
// this screen, so the body makes that prompt expected: 'Tap "Connect" if your phone asks for
// permission.' (17, white, height 1.4), 15, a note (14, Gravel, height 1.4). Hero: the four-dot
// spinner (white). Help (the FAB): "Joining the HUB's Network". Exit: "Cancel".

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { showPopupMessage } from '../../../../components/popups/popups';
import { SpinKitFadingFour } from '../../../../components/progress/SpinKitFadingFour';
import { kCartellLightGray, MaterialColors } from '../../../../theme/colors';
import { joinApprovalLabel } from '../connectionConstants';
import { pairingText } from './pairingText';

function explainThePrompt() {
  showPopupMessage({
    title: "Joining the HUB's Network",
    message:
      'To set up your HUB, your phone leaves your home network and joins ' +
      'the network the HUB makes. Your phone asks permission before it ' +
      'does that.\n\n' +
      'Answer as soon as you see the prompt. If it goes unanswered this ' +
      'step times out, and you will have to start it again.\n\n' +
      'If you already tapped Cancel on it, cancel this step and begin ' +
      'again.',
    okayButtonLabel: 'Got it',
  });
}

export function ConnectingToHubWidget() {
  return (
    <PairingStepScaffold
      title="Connecting to HUB"
      subtitle="Your phone has to join the HUB's own network for this step."
      hero={<SpinKitFadingFour color={MaterialColors.white} />}
      exitLabel="Cancel"
      help={explainThePrompt}
    >
      <Text style={promptText}>
        {`Tap "${joinApprovalLabel()}" if your phone asks for permission.`}
      </Text>
      <View style={styles.gap15} />
      <Text style={noteText}>
        {'Your phone may ask each time it joins a HUB. Pairing cannot ' +
          'continue until you answer.'}
      </Text>
    </PairingStepScaffold>
  );
}

const promptText = pairingText(
  { fontSize: 17, color: MaterialColors.white, height: 1.4 },
  'center',
);
const noteText = pairingText(
  { fontSize: 14, color: kCartellLightGray, height: 1.4 },
  'center',
);

const styles = StyleSheet.create({ gap15: { height: 15 } });
