// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/reestablish_connection_to_server_widget.dart:
// "Reconnecting to the server", "Please wait" (unnumbered), while the phone gets back to a network
// that reaches the server (up to 90 s).
//
// Hero: a spinning ring (150, stroke 15, blue on a Deep Gravel track). "Cancel" (blue): while a
// teardown owns the flow it asks the wait to stop (the error then shows at once); otherwise it
// abandons pairing ("Pairing was cancelled. \nPlease try again later.", d63f9b07). No exit button.

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { CircularProgressIndicator } from '../../../../components/progress/CircularProgressIndicator';
import {
  kCartellBlue,
  kCartellDarkGray,
  MaterialColors,
} from '../../../../theme/colors';
import { ErrorOccurredEvent } from '../events/errorEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';

export function ReestablishConnectionToServerWidget() {
  const bloc = useHubConnectionBloc();
  return (
    <PairingStepScaffold
      title="Reconnecting to the server"
      subtitle="Please wait"
      hero={
        <View style={styles.hero}>
          <CircularProgressIndicator
            size={150}
            color={kCartellBlue}
            backgroundColor={kCartellDarkGray}
            strokeWidth={15}
          />
        </View>
      }
    >
      <RoundedButton
        onPressed={() => {
          if (bloc.teardownInFlight) {
            bloc.abandonRequested = true;
            return;
          }
          bloc.add(
            new ErrorOccurredEvent({
              errorMessage: 'Pairing was cancelled. \nPlease try again later.',
              errorCode: 'd63f9b07',
            }),
          );
        }}
        title="Cancel"
        buttonColor={kCartellBlue}
        buttonTitleColor={MaterialColors.black}
      />
    </PairingStepScaffold>
  );
}

const styles = StyleSheet.create({ hero: { width: 150, height: 150 } });
