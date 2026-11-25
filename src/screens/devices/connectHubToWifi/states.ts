// Port of frontend/lib/screens/devices/connect_hub_to_wifi/states.dart: the pairing wizard's
// states. The screen shown is a function of the current one.
//
// Flutter's states have no equality of their own, so every emit is a new state, even of the same
// class (NetworkDiscoveredEvent re-emits ConnectedToHubState to redraw the list). Each state here
// carries a unique stamp for the same reason. None go on GenericBloc's back-stack.

import { GenericState, stateTimestamp } from '../../../state/genericBloc';
import type { ScanWifiNetworksReply } from '../../../udpCommands/commands';
import type { WaitingReason } from './hubRegistrationCheck';

export abstract class HubConnectionState extends GenericState {
  private readonly stamp = stateTimestamp();
  constructor() {
    super(false);
  }
  get props(): unknown[] {
    return [this.stamp];
  }
}

export class BeginPairingHubState extends HubConnectionState {}

export class CheckingHubIsPluggedInState extends HubConnectionState {}

export class CheckingLightOfHubState extends HubConnectionState {}

export class ResettingHubWifiCredentialsState extends HubConnectionState {}

export class InitialHubConnectionState extends HubConnectionState {}

export class ConnectingToHubState extends HubConnectionState {}

export class VerifyingHubConnectionState extends HubConnectionState {}

export class ConnectedToHubState extends HubConnectionState {}

export class SelectedNetworkState extends HubConnectionState {
  constructor(readonly wifiNetwork: ScanWifiNetworksReply) {
    super();
  }
}

export class HubConnectingToWifiState extends HubConnectionState {}

export class CheckingIfHubConnectedToWifiState extends HubConnectionState {
  /** startedAt: when the poll began (ms since the epoch); the screen counts from it. */
  readonly startedAt: number;
  /** Why we are still waiting; follows the last check. */
  readonly reason: WaitingReason;
  /** Whether the hub's light readings are offered. Sticky, unlike the reason. */
  readonly showLightReadings: boolean;

  constructor({
    startedAt,
    reason,
    showLightReadings = false,
  }: {
    startedAt: number;
    reason: WaitingReason;
    showLightReadings?: boolean;
  }) {
    super();
    this.startedAt = startedAt;
    this.reason = reason;
    this.showLightReadings = showLightReadings;
  }
}

export class HubConnectedToWifiSuccessfullyState extends HubConnectionState {}

/** The hub answered on its own network, so it never joined: the one confident failure. */
export class HubRevertedToAccessPointState extends HubConnectionState {}

/** The user stopped waiting. Not a failure: pairing was never shown to have failed. */
export class PairingStoppedState extends HubConnectionState {}

export class AnErrorOccurredState extends HubConnectionState {
  readonly errorMessage: string;
  readonly errorCode: string;
  /** Shown under the message at body size. */
  readonly errorDetail: string | null;

  constructor({
    errorMessage,
    errorCode,
    errorDetail = null,
  }: {
    errorMessage: string;
    errorCode: string;
    errorDetail?: string | null;
  }) {
    super();
    this.errorMessage = errorMessage;
    this.errorCode = errorCode;
    this.errorDetail = errorDetail;
  }
}

/** The session died while waiting: a real failure, unlike PairingStoppedState. */
export class SessionExpiredState extends HubConnectionState {}

export class ReestablishConnectionToServerState extends HubConnectionState {}

export class WifiReconnectFailedState extends HubConnectionState {}

export class ReconnectToServerSuccessfullyState extends HubConnectionState {}
