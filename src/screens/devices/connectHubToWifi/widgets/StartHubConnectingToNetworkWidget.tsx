// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/start_hub_connecting_to_wifi_widget.dart:
// step 6 while the Wi-Fi details go to the hub, "Sending data to Hub": the four-dot spinner and
// "Cancel".

import React from 'react';

import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { SpinKitFadingFour } from '../../../../components/progress/SpinKitFadingFour';
import { MaterialColors } from '../../../../theme/colors';

export function StartHubConnectingToNetworkWidget() {
  return (
    <PairingStepScaffold
      title="Sending data to Hub"
      hero={<SpinKitFadingFour color={MaterialColors.white} />}
      exitLabel="Cancel"
    />
  );
}
