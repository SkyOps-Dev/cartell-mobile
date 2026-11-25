// Ported from frontend/test/screens/devices/connect_hub_to_wifi/pairing_step_index_test.dart.

import { testWifiNetwork } from '../../../helpers/pairingFixtures';
import { PairingStep } from '../../../../src/components/pairing/pairingStep';
import { WaitingReason } from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationCheck';
import { pairingStepIndex } from '../../../../src/screens/devices/connectHubToWifi/pairingStepIndex';
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

describe('pairingStepIndex', () => {
  test('numbers the six steps where the user acts', () => {
    expect(pairingStepIndex(new BeginPairingHubState()).index).toBe(1);
    expect(pairingStepIndex(new CheckingHubIsPluggedInState()).index).toBe(2);
    expect(pairingStepIndex(new CheckingLightOfHubState()).index).toBe(3);
    expect(pairingStepIndex(new InitialHubConnectionState()).index).toBe(4);
    expect(pairingStepIndex(new ConnectedToHubState()).index).toBe(5);
  });

  test('returns a value that compares by index and total', () => {
    expect(
      pairingStepIndex(new BeginPairingHubState()).equals(
        new PairingStep(1, 6),
      ),
    ).toBe(true);
    expect(
      pairingStepIndex(new BeginPairingHubState()).equals(
        pairingStepIndex(new CheckingHubIsPluggedInState()),
      ),
    ).toBe(false);
    expect(
      pairingStepIndex(new PairingStoppedState()).equals(PairingStep.none()),
    ).toBe(true);
  });

  test('the password screen is step 6', () => {
    expect(
      pairingStepIndex(new SelectedNetworkState(testWifiNetwork())).index,
    ).toBe(6);
  });

  test('every numbered step reports the same total', () => {
    // A total that varies by screen reads as a broken counter.
    for (const state of [
      new BeginPairingHubState(),
      new CheckingHubIsPluggedInState(),
      new CheckingLightOfHubState(),
      new InitialHubConnectionState(),
      new ConnectedToHubState(),
    ]) {
      expect(pairingStepIndex(state).total).toBe(6);
    }
  });

  test('a waiting screen borrows the step it belongs to, never a new one', () => {
    expect(pairingStepIndex(new ConnectingToHubState()).index).toBe(4);
    expect(pairingStepIndex(new VerifyingHubConnectionState()).index).toBe(4);
    expect(pairingStepIndex(new HubConnectingToWifiState()).index).toBe(6);
    expect(pairingStepIndex(waiting()).index).toBe(6);
  });

  test('the count never moves backwards through the happy path', () => {
    const indices = [
      new BeginPairingHubState(),
      new CheckingHubIsPluggedInState(),
      new CheckingLightOfHubState(),
      new InitialHubConnectionState(),
      new ConnectingToHubState(),
      new VerifyingHubConnectionState(),
      new ConnectedToHubState(),
      new HubConnectingToWifiState(),
    ].map(state => pairingStepIndex(state).index);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
    }
  });

  test('terminal screens are unnumbered', () => {
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
      expect(pairingStepIndex(state).isNumbered).toBe(false);
    }
  });

  test('the reset detour is unnumbered because it is repair, not progress', () => {
    expect(
      pairingStepIndex(new ResettingHubWifiCredentialsState()).isNumbered,
    ).toBe(false);
  });

  test('the abandon-cleanup state is unnumbered because it is reachable from every guarded step', () => {
    expect(
      pairingStepIndex(new ReestablishConnectionToServerState()).isNumbered,
    ).toBe(false);
  });
});
