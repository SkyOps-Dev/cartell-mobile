// Port of pairingCanPop and abandonEventFor from
// frontend/lib/screens/devices/connect_hub_to_wifi/widgets/hub_connect_widget.dart: whether
// leaving the wizard is safe in a state, and what leaving dispatches when it is not.
// (requestPairingExit, the same file's "Stop Pairing?" confirmation, belongs with the screens.)

import { ErrorOccurredEvent } from './events/errorEvents';
import { CancelWaitingForHubEvent } from './events/wifiConnectionEvents';
import type { HubConnectionEvent } from './hubConnectionBloc';
import { HubRegistrationErrorCodes } from './pairingErrorCodes';
import {
  AnErrorOccurredState,
  BeginPairingHubState,
  CheckingHubIsPluggedInState,
  CheckingIfHubConnectedToWifiState,
  CheckingLightOfHubState,
  HubConnectedToWifiSuccessfullyState,
  HubConnectionState,
  HubRevertedToAccessPointState,
  InitialHubConnectionState,
  PairingStoppedState,
  ReconnectToServerSuccessfullyState,
  ResettingHubWifiCredentialsState,
  SessionExpiredState,
  WifiReconnectFailedState,
} from './states';

/** States where leaving needs no confirmation: nothing asked of the hub yet, or an outcome. */
const poppableStates = [
  BeginPairingHubState,
  // Plug it in, look at the light, hold the reset button: nothing has been sent to the hub.
  CheckingHubIsPluggedInState,
  CheckingLightOfHubState,
  ResettingHubWifiCredentialsState,
  InitialHubConnectionState,
  // Outcomes: nothing left to lose.
  HubConnectedToWifiSuccessfullyState,
  PairingStoppedState,
  HubRevertedToAccessPointState,
  AnErrorOccurredState,
  SessionExpiredState,
  WifiReconnectFailedState,
  ReconnectToServerSuccessfullyState,
];

/**
 * Whether Back (or the exit button) may leave without "Stop Pairing?". False once the hub is
 * being asked for something or is mid-setup, where leaving strands the phone on its network.
 */
export function pairingCanPop(state: HubConnectionState): boolean {
  return poppableStates.some(stateClass => state instanceof stateClass);
}

/**
 * What abandoning dispatches: on the waiting screen, Cancel (which settles the poll without
 * claiming failure); everywhere else the flow's teardown, with a code for where the user was.
 */
export function abandonEventFor(state: HubConnectionState): HubConnectionEvent {
  return state instanceof CheckingIfHubConnectedToWifiState
    ? new CancelWaitingForHubEvent()
    : new ErrorOccurredEvent({
        errorMessage: 'Pairing was cancelled. \nPlease try again later.',
        errorCode: HubRegistrationErrorCodes.cancelledAt(state),
      });
}
