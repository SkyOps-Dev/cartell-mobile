// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/wifi_reconnect_failed_widget.dart:
// the phone did not get back to a network that reaches the server within 90 s (unnumbered).
// wifi_off (150, amber), "Please verify your network connection and try again", "Try Reconnecting
// Again" (amber, FA rss) → the reconnect wait again. No exit button.

import React from 'react';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { kCartellYellow, MaterialColors } from '../../../../theme/colors';
import { ReestablishConnectionToServerEvent } from '../events/errorEvents';
import { useHubConnectionBloc } from '../HubConnectionBlocContext';

export function WifiReconnectFailedWidget() {
  const bloc = useHubConnectionBloc();
  return (
    <PairingStepScaffold
      heroLeads
      title="Please verify your network connection and try again"
      hero={<Icon icon={Icons.wifi_off} size={150} color={kCartellYellow} />}
    >
      <RoundedButton
        onPressed={() => {
          bloc.add(new ReestablishConnectionToServerEvent());
        }}
        icon={FontAwesomeIcons.rss}
        iconColor={MaterialColors.black}
        title="Try Reconnecting Again"
        buttonColor={kCartellYellow}
        buttonTitleColor={MaterialColors.black}
      />
    </PairingStepScaffold>
  );
}
