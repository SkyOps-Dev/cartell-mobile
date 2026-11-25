// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/success_widget.dart: an outcome
// (unnumbered): FA circleCheck (70, amber), then the message ("Hub has successfully connected to
// the network." or "Successfully reconnected to the server."), and "Continue" (blue) → the Hubs
// list. No exit button.

import React from 'react';

import { RoundedButton } from '../../../../components/buttons/RoundedButton';
import { Icon } from '../../../../components/icons/Icon';
import { FontAwesomeIcons } from '../../../../components/icons/iconData';
import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { GoToDevicesHomeScreen } from '../../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../../state/devices/DevicesBlocContext';
import {
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../../../theme/colors';

export function SuccessWidget({ message }: { message: string }) {
  const readDevicesBloc = useReadDevicesBloc();
  return (
    <PairingStepScaffold
      title={message}
      heroLeads
      hero={
        <Icon
          icon={FontAwesomeIcons.circleCheck}
          size={70}
          color={kCartellYellow}
        />
      }
    >
      <RoundedButton
        onPressed={() => {
          // PORT-GAP: UserFeedback.requestUserFeedback(context, "Device connect to network
          // success", then) first (the feedback popup); `then` is what follows. Its flag is false
          // outside debug builds (quirk Q32), so a release build goes straight on, as here.
          readDevicesBloc().add(new GoToDevicesHomeScreen());
        }}
        title="Continue"
        buttonColor={kCartellBlue}
        buttonTitleColor={MaterialColors.black}
      />
    </PairingStepScaffold>
  );
}
