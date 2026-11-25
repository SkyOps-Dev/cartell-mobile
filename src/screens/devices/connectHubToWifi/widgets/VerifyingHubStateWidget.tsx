// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/verifying_hub_state_widget.dart:
// step 3, "Check the Light on Your Hub".
//
// Hero: the hub light playing Wi-Fi Pairing Mode. "(The light should be located next to the
// antenna)" (14, padded 14 across and 10 down), then "Yes" (amber, FA check) → "Connect to Your
// Hub"; "It blinks differently" (blue, FA rotate) → "Reset Your Hub?" (Keep trying / Reset the hub
// → the reset step); "I can't find the light" (blue, FA circleQuestion) → the help. Help (also the
// FAB): "Finding the Light on Your Hub" (Look again / Contact support). Exit: "Cancel".

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import {
  hubLightWifiAccessPointMode,
  HubLightWidget,
} from '../../../../components/HubLightWidget';
import { FontAwesomeIcons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import {
  popPopup,
  showPopupMessage,
} from '../../../../components/popups/popups';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import {
  HubIsNotInTheCorrectStateEvent,
  VerifyThatHubIsReadyToPairToWifiEvent,
} from '../events/hubSetupEvents';
import type { HubConnectionBloc } from '../hubConnectionBloc';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';
import { pairingText } from './pairingText';

/** A factory reset wipes a hub that may be working, so the consequence is named first. */
function confirmReset(bloc: HubConnectionBloc) {
  showPopupMessage({
    title: 'Reset Your Hub?',
    message:
      'Resetting erases the Wi-Fi settings stored on your hub so it ' +
      'can start pairing again. Your account and your sensors are not ' +
      'affected.\n\n' +
      'If your hub is already working on another network, resetting it ' +
      'will disconnect it.',
    okayButtonLabel: 'Keep trying',
    cancelButtonLabel: 'Reset the hub',
    onCancel: () => {
      popPopup();
      bloc.add(new HubIsNotInTheCorrectStateEvent());
    },
  });
}

function showHelpDialog() {
  showPopupMessage({
    title: 'Finding the Light on Your Hub',
    message:
      'The light sits next to the antenna. It is small, and in ' +
      'daylight you may need to shade it with your hand.\n\n' +
      'Make sure the hub is plugged in and has had a few seconds to ' +
      'start up. If you still cannot see any light at all, contact ' +
      'support.',
    okayButtonLabel: 'Look again',
    cancelButtonLabel: 'Contact support',
    onCancel: () => {
      popPopup();
      // PORT-GAP: Navigator.popAndPushNamed(context, ContactUs.id): after closing the popup,
      // Flutter opens the Contact Us page (screens/misc/contact_us.dart).
    },
  });
}

export function VerifyingHubStateWidget() {
  const bloc = useHubConnectionBloc();
  return (
    <PairingStepScaffold
      exitLabel="Cancel"
      title="Check the Light on Your Hub"
      subtitle="Does your Hub's light blink like this?"
      hero={
        <HubLightWidget
          pattern={hubLightWifiAccessPointMode.pattern}
          semanticLabel={hubLightWifiAccessPointMode.name}
        />
      }
      help={showHelpDialog}
    >
      <View style={styles.notePadding}>
        <Text style={noteText}>
          (The light should be located next to the antenna)
        </Text>
      </View>
      <RoundedButton
        onPressed={() => {
          bloc.add(new VerifyThatHubIsReadyToPairToWifiEvent());
        }}
        title="Yes"
        buttonTitleColor={MaterialColors.black}
        buttonColor={kCartellYellow}
        icon={FontAwesomeIcons.check}
        iconColor={kCartellBlack}
      />
      <RoundedButton
        onPressed={() => confirmReset(bloc)}
        title="It blinks differently"
        buttonTitleColor={MaterialColors.black}
        buttonColor={kCartellBlue}
        icon={FontAwesomeIcons.rotate}
        iconColor={kCartellBlack}
      />
      <RoundedButton
        onPressed={showHelpDialog}
        title="I can't find the light"
        buttonTitleColor={MaterialColors.black}
        buttonColor={kCartellBlue}
        icon={FontAwesomeIcons.circleQuestion}
        iconColor={kCartellBlack}
      />
    </PairingStepScaffold>
  );
}

const noteText = pairingText({ fontSize: 14 }, 'center');

const styles = StyleSheet.create({
  notePadding: { paddingHorizontal: 14, paddingVertical: 10 },
});
