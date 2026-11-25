// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/begin_pairing_hub_widget.dart:
// step 1, "Getting Your Hub Ready".
//
// A 15-second countdown: a ring (150, stroke 15, blue on Deep Gravel) fills as the seconds count
// down, the seconds (50, bold, white) 38 from its top, then FA check (75, amber) at 0. "Start
// Pairing" (amber, FA rss) turns on at 0 → "Plug in Hub". Exit: "Return to Devices".

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { CircularProgressIndicator } from '../../../../components/progress/CircularProgressIndicator';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellDarkGray,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';
import { beginPairingWaitTime } from '../connectionConstants';
import { CheckingHubIsPluggedInEvent } from '../events/hubSetupEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';
import { pairingText } from './pairingText';

export function BeginPairingHubWidget() {
  const bloc = useHubConnectionBloc();
  const [secondsLeft, setSecondsLeft] = useState(beginPairingWaitTime);

  useEffect(() => {
    let left = beginPairingWaitTime;
    const timer = setInterval(() => {
      if (left - 1 === 0) {
        clearInterval(timer);
      }
      left--;
      setSecondsLeft(left);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PairingStepScaffold
      exitLabel="Return to Devices"
      title="Getting Your Hub Ready"
      subtitle={
        'Your hub needs a moment to switch into pairing mode. ' +
        'Start Pairing turns on when it is ready.'
      }
      hero={
        <View style={styles.hero}>
          <View style={styles.ring}>
            <CircularProgressIndicator
              size={150}
              value={1 - secondsLeft / beginPairingWaitTime}
              color={kCartellBlue}
              backgroundColor={kCartellDarkGray}
              strokeWidth={15}
            />
          </View>
          <View style={styles.count}>
            {secondsLeft > 0 ? (
              <Text style={countText}>{`${secondsLeft}`}</Text>
            ) : (
              <Icon
                icon={FontAwesomeIcons.check}
                color={kCartellYellow}
                size={75}
              />
            )}
          </View>
        </View>
      }
    >
      <RoundedButton
        onPressed={
          secondsLeft <= 0
            ? () => {
                bloc.add(new CheckingHubIsPluggedInEvent());
              }
            : null
        }
        title="Start Pairing"
        buttonTitleColor={MaterialColors.black}
        buttonColor={kCartellYellow}
        icon={FontAwesomeIcons.rss}
        iconColor={kCartellBlack}
      />
    </PairingStepScaffold>
  );
}

const countText = pairingText({
  fontWeight: 'bold',
  color: MaterialColors.white,
  fontSize: 50,
});

const styles = StyleSheet.create({
  // Stack(fit: loose) of two Aligns: as wide as the column, as tall as the ring.
  hero: { alignSelf: 'stretch', height: 150 },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  count: {
    position: 'absolute',
    top: 38,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
