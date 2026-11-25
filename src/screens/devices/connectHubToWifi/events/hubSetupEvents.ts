// Port of frontend/lib/screens/devices/connect_hub_to_wifi/events/hub_setup_events.dart: the
// wizard's first screens, before anything is asked of the hub. Each only moves the screen on.

import type { Emitter } from '../../../../state/genericBloc';
import type {
  HubConnectionBloc,
  HubConnectionEvent,
} from '../hubConnectionBloc';
import {
  BeginPairingHubState,
  CheckingHubIsPluggedInState,
  CheckingLightOfHubState,
  HubConnectionState,
  InitialHubConnectionState,
  ResettingHubWifiCredentialsState,
} from '../states';

type Emit = Emitter<HubConnectionState>;

export class BeginPairingHubEvent implements HubConnectionEvent {
  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(new BeginPairingHubState());
  }
}

export class CheckingHubIsPluggedInEvent implements HubConnectionEvent {
  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(new CheckingHubIsPluggedInState());
  }
}

export class VerifyThatHubIsPluggedInEvent implements HubConnectionEvent {
  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(new CheckingLightOfHubState());
  }
}

export class VerifyThatHubIsReadyToPairToWifiEvent
  implements HubConnectionEvent
{
  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(new InitialHubConnectionState());
  }
}

export class HubIsNotInTheCorrectStateEvent implements HubConnectionEvent {
  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(new ResettingHubWifiCredentialsState());
  }
}

export class HubHasBeenResetEvent implements HubConnectionEvent {
  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(new CheckingLightOfHubState());
  }
}
