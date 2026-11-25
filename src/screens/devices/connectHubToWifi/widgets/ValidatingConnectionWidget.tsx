// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/validating_connection_widget.dart:
// step 4 while the hub is asked for its version, "Checking Connection to HUB": the four-dot
// spinner and "Cancel".

import React from 'react';

import { PairingStepScaffold } from '../../../../components/pairing/PairingStepScaffold';
import { SpinKitFadingFour } from '../../../../components/progress/SpinKitFadingFour';
import { MaterialColors } from '../../../../theme/colors';

export function ValidatingConnectionWidget() {
  return (
    <PairingStepScaffold
      title="Checking Connection to HUB"
      hero={<SpinKitFadingFour color={MaterialColors.white} />}
      exitLabel="Cancel"
    />
  );
}
