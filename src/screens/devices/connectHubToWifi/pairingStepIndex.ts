// Port of frontend/lib/screens/devices/connect_hub_to_wifi/pairing_step_index.dart: which of the
// six numbered steps a state belongs to. Only the steps where the user acts are numbered; a
// waiting screen borrows its step, so the count never goes back; outcomes, the reset detour and
// the abandon clean-up carry no number.

import { PairingStep } from '../../../components/pairing/pairingStep';
import {
  BeginPairingHubState,
  CheckingHubIsPluggedInState,
  CheckingIfHubConnectedToWifiState,
  CheckingLightOfHubState,
  ConnectedToHubState,
  ConnectingToHubState,
  HubConnectingToWifiState,
  HubConnectionState,
  InitialHubConnectionState,
  SelectedNetworkState,
  VerifyingHubConnectionState,
} from './states';

const totalPairingSteps = 6;

export function pairingStepIndex(state: HubConnectionState): PairingStep {
  if (state instanceof BeginPairingHubState) {
    return step(1);
  }
  if (state instanceof CheckingHubIsPluggedInState) {
    return step(2);
  }
  if (state instanceof CheckingLightOfHubState) {
    return step(3);
  }
  if (
    state instanceof InitialHubConnectionState ||
    state instanceof ConnectingToHubState ||
    state instanceof VerifyingHubConnectionState
  ) {
    return step(4);
  }
  if (state instanceof ConnectedToHubState) {
    return step(5);
  }
  if (
    state instanceof SelectedNetworkState ||
    state instanceof HubConnectingToWifiState ||
    state instanceof CheckingIfHubConnectedToWifiState
  ) {
    return step(6);
  }
  return PairingStep.none();
}

function step(index: number): PairingStep {
  return new PairingStep(index, totalPairingSteps);
}
