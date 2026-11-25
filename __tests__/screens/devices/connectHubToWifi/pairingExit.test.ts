// Ported from frontend/test/screens/devices/connect_hub_to_wifi/abandon_guard_test.dart.

import { testWifiNetwork } from '../../../helpers/pairingFixtures';
import { ErrorOccurredEvent } from '../../../../src/screens/devices/connectHubToWifi/events/errorEvents';
import { CancelWaitingForHubEvent } from '../../../../src/screens/devices/connectHubToWifi/events/wifiConnectionEvents';
import { WaitingReason } from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationCheck';
import {
  abandonEventFor,
  pairingCanPop,
} from '../../../../src/screens/devices/connectHubToWifi/pairingExit';
import {
  AnErrorOccurredState,
  BeginPairingHubState,
  CheckingHubIsPluggedInState,
  CheckingIfHubConnectedToWifiState,
  CheckingLightOfHubState,
  ConnectedToHubState,
  ConnectingToHubState,
  HubConnectedToWifiSuccessfullyState,
  HubConnectingToWifiState,
  HubConnectionState,
  HubRevertedToAccessPointState,
  InitialHubConnectionState,
  PairingStoppedState,
  ReconnectToServerSuccessfullyState,
  ReestablishConnectionToServerState,
  ResettingHubWifiCredentialsState,
  SelectedNetworkState,
  SessionExpiredState,
  VerifyingHubConnectionState,
  WifiReconnectFailedState,
} from '../../../../src/screens/devices/connectHubToWifi/states';

const waiting = () =>
  new CheckingIfHubConnectedToWifiState({
    startedAt: Date.UTC(2026, 0, 1),
    reason: WaitingReason.waitingForHub,
  });

describe('pairingCanPop', () => {
  test('Back pops freely before anything is asked of the hub', () => {
    expect(pairingCanPop(new BeginPairingHubState())).toBe(true);
  });

  test('Back pops freely on every terminal state', () => {
    const terminal: HubConnectionState[] = [
      new HubConnectedToWifiSuccessfullyState(),
      new PairingStoppedState(),
      new AnErrorOccurredState({ errorMessage: 'x', errorCode: 'y' }),
      new SessionExpiredState(),
      new WifiReconnectFailedState(),
      new ReconnectToServerSuccessfullyState(),
      new HubRevertedToAccessPointState(),
    ];
    for (const state of terminal) {
      expect(pairingCanPop(state)).toBe(true);
    }
  });

  test('leaving is free before anything is asked of the hub', () => {
    // Plug it in, look at a light, hold the reset button: nothing to strand.
    for (const state of [
      new CheckingHubIsPluggedInState(),
      new CheckingLightOfHubState(),
      new ResettingHubWifiCredentialsState(),
      new InitialHubConnectionState(),
    ]) {
      expect(pairingCanPop(state)).toBe(true);
    }
  });

  test('Back is guarded once the hub has been asked for something', () => {
    for (const state of [
      new ConnectingToHubState(),
      new VerifyingHubConnectionState(),
      new ConnectedToHubState(),
      new HubConnectingToWifiState(),
      new ReestablishConnectionToServerState(),
    ]) {
      expect(pairingCanPop(state)).toBe(false);
    }
  });

  test('the two states carrying payloads are also guarded', () => {
    expect(pairingCanPop(new SelectedNetworkState(testWifiNetwork()))).toBe(
      false,
    );
    expect(pairingCanPop(waiting())).toBe(false);
  });
});

describe('abandonEventFor', () => {
  test('settles the registration poll without claiming failure', () => {
    expect(abandonEventFor(waiting())).toBeInstanceOf(CancelWaitingForHubEvent);
  });

  test('every other guarded state gets a real abandon', () => {
    for (const state of [
      new CheckingHubIsPluggedInState(),
      new CheckingLightOfHubState(),
      new ResettingHubWifiCredentialsState(),
      new InitialHubConnectionState(),
      new ConnectingToHubState(),
      new VerifyingHubConnectionState(),
      new ConnectedToHubState(),
      new HubConnectingToWifiState(),
      new ReestablishConnectionToServerState(),
    ]) {
      expect(abandonEventFor(state)).toBeInstanceOf(ErrorOccurredEvent);
    }
  });

  test('the abandon says where the user was (e5b1907d-…)', () => {
    const codeAt = (state: HubConnectionState) =>
      (abandonEventFor(state) as ErrorOccurredEvent).errorCode;
    expect(codeAt(new ConnectingToHubState())).toBe('e5b1907d-J');
    expect(codeAt(new VerifyingHubConnectionState())).toBe('e5b1907d-V');
    expect(codeAt(new ConnectedToHubState())).toBe('e5b1907d-N');
    expect(codeAt(new SelectedNetworkState(testWifiNetwork()))).toBe(
      'e5b1907d-K',
    );
    expect(codeAt(new HubConnectingToWifiState())).toBe('e5b1907d-S');
    expect(codeAt(new ReestablishConnectionToServerState())).toBe('e5b1907d-R');
    expect(codeAt(new CheckingHubIsPluggedInState())).toBe('e5b1907d-C');
    expect(
      (abandonEventFor(new ConnectingToHubState()) as ErrorOccurredEvent)
        .errorMessage,
    ).toBe('Pairing was cancelled. \nPlease try again later.');
  });
});
