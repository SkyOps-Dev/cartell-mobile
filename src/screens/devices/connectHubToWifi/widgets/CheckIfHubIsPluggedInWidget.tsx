// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/check_if_plugged_in_widget.dart:
// step 2, "Plug in Hub".
//
// Hero: electrical_services (125, white) in a kActiveCardColor circle (padding 8) in a white
// circle (padding 8). "Yes" (amber, FA check) → "Check the Light on Your Hub". Help (the FAB):
// "Plugging In Your Hub". Exit: "Cancel".

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { showPopupMessage } from '../../../../components/popups/popups';
import {
  kActiveCardColor,
  kCartellBlack,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import { VerifyThatHubIsPluggedInEvent } from '../events/hubSetupEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';

function showHelpDialog() {
  showPopupMessage({
    title: 'Plugging In Your Hub',
    message:
      'Connect the power adapter to your hub and plug it into a wall ' +
      'outlet. Your hub needs to stay plugged in from now on. It is ' +
      'what keeps your sensors talking to Cartell.\n\n' +
      'Once it has power, a light next to the antenna will start to ' +
      'blink. Contact support if no light comes on at all.',
    okayButtonLabel: 'Got it',
  });
}

export function CheckIfHubIsPluggedInWidget() {
  const bloc = useHubConnectionBloc();
  return (
    <PairingStepScaffold
      exitLabel="Cancel"
      title="Plug in Hub"
      subtitle="Is your hub plugged in?"
      hero={
        <View style={[styles.circle, styles.outer]}>
          <View style={[styles.circle, styles.inner]}>
            <Icon
              icon={Icons.electrical_services}
              color={MaterialColors.white}
              size={125}
            />
          </View>
        </View>
      }
      help={showHelpDialog}
    >
      <RoundedButton
        onPressed={() => {
          bloc.add(new VerifyThatHubIsPluggedInEvent());
        }}
        title="Yes"
        buttonTitleColor={MaterialColors.black}
        buttonColor={kCartellYellow}
        icon={FontAwesomeIcons.check}
        iconColor={kCartellBlack}
      />
    </PairingStepScaffold>
  );
}

const styles = StyleSheet.create({
  circle: { padding: 8, borderRadius: 1000 },
  outer: { backgroundColor: MaterialColors.white },
  inner: { backgroundColor: kActiveCardColor },
});
