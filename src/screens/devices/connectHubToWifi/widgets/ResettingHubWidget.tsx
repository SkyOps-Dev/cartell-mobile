// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/resetting_hub_widget.dart: the
// reset detour (unnumbered), "Hold the Reset Button In".
//
// Hero: the hub light playing Resetting (fast red). Two lines of instructions (16, padded 14
// across), 20 apart and 20 after. For the first 3 s, a moving bar (blue on Deep Gravel, 40 tall,
// as wide as the column, corners 16, padded 10 down); then "The Hub Reset" (amber, FA check) →
// "Check the Light on Your Hub" again. Exit: "Cancel".

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import {
  hubLightResetting,
  HubLightWidget,
} from '../../../../components/HubLightWidget';
import { FontAwesomeIcons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { LinearProgressIndicator } from '../../../../components/progress/LinearProgressIndicator';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellDarkGray,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import { HubHasBeenResetEvent } from '../events/hubSetupEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';
import { pairingText } from './pairingText';

export function ResettingHubWidget() {
  const bloc = useHubConnectionBloc();
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PairingStepScaffold
      exitLabel="Cancel"
      title="Hold the Reset Button In"
      hero={
        <HubLightWidget
          pattern={hubLightResetting.pattern}
          semanticLabel={hubLightResetting.name}
        />
      }
    >
      <View style={styles.textPadding}>
        <Text style={bodyText}>
          Find the reset button on your hub and hold it in until the light
          blinks like above. Then release the button. Your hub's Wi-Fi settings
          are now reset.
        </Text>
      </View>
      <View style={styles.gap20} />
      <View style={styles.textPadding}>
        <Text style={bodyText}>
          Once your hub has reset, press "The Hub Reset" below.
        </Text>
      </View>
      <View style={styles.gap20} />
      {!waited && (
        <View style={styles.barPadding}>
          <View style={styles.bar}>
            <LinearProgressIndicator
              backgroundColor={kCartellDarkGray}
              valueColor={kCartellBlue}
            />
          </View>
        </View>
      )}
      {waited && (
        <RoundedButton
          onPressed={() => {
            bloc.add(new HubHasBeenResetEvent());
          }}
          title="The Hub Reset"
          buttonTitleColor={MaterialColors.black}
          buttonColor={kCartellYellow}
          icon={FontAwesomeIcons.check}
          iconColor={kCartellBlack}
        />
      )}
    </PairingStepScaffold>
  );
}

const bodyText = pairingText({ fontSize: 16 }, 'center');

const styles = StyleSheet.create({
  textPadding: { paddingHorizontal: 14 },
  gap20: { height: 20 },
  barPadding: { alignSelf: 'stretch', paddingVertical: 10 },
  bar: { height: 40, borderRadius: 16, overflow: 'hidden' },
});
