// Port of frontend/lib/screens/devices/connect_hub_to_wifi/widgets/hub_connect_widget.dart: the
// pairing wizard for one hub (DevicesBloc's IsConnectingHubState), and requestPairingExit.
// (pairingCanPop and abandonEventFor, from the same file, are in pairingExit.ts.)
//
// Makes the wizard's bloc when it opens and closes it when it goes. PopScope → SafeArea → the
// screen for the current state, given its step number ("Step N of 6") and the way out
// (requestPairingExit) through context. Every state change shows its screen at once (no
// transition); a screen of the same kind stays mounted, as Flutter keeps a widget of the same type.
//
// Back never leaves on its own: the shells above hold their own PopScope(canPop: false), so it
// always comes to requestPairingExit, the same function the screens' exit button calls. That
// leaves at once where nothing is at stake (pairingCanPop), and otherwise asks "Stop Pairing?".

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { PopScope } from '../../../components/layout/PopScope';
import { SafeArea } from '../../../components/layout/SafeArea';
import {
  PairingExitContext,
  PairingStepContext,
} from '../../../components/pairing/PairingStepScaffold';
import { popPopup, showPopupMessage } from '../../../components/popups/popups';
import type { Device } from '../../../models/device';
import {
  DevicesBloc,
  GoToDevicesHomeScreen,
} from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import { HubConnectionBloc } from './hubConnectionBloc';
import { HubConnectionBlocProvider } from './HubConnectionBlocContext';
import { HubRegistrationErrorCodes } from './pairingErrorCodes';
import { abandonEventFor, pairingCanPop } from './pairingExit';
import { pairingStepIndex } from './pairingStepIndex';
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
} from './states';
import { BeginPairingHubWidget } from './widgets/BeginPairingHubWidget';
import { CheckIfHubIsPluggedInWidget } from './widgets/CheckIfHubIsPluggedInWidget';
import { CheckingIfHubConnectedToServerWidget } from './widgets/CheckingIfHubConnectedToServerWidget';
import { ConnectingToHubWidget } from './widgets/ConnectingToHubWidget';
import { FailureWidget } from './widgets/FailureWidget';
import { HubRevertedWidget } from './widgets/HubRevertedWidget';
import { InitialConnectionWidget } from './widgets/InitialConnectionWidget';
import { ListWifiNetworksWidget } from './widgets/ListWifiNetworksWidget';
import { PairingStoppedWidget } from './widgets/PairingStoppedWidget';
import { ReestablishConnectionToServerWidget } from './widgets/ReestablishConnectionToServerWidget';
import { ResettingHubWidget } from './widgets/ResettingHubWidget';
import { StartHubConnectingToNetworkWidget } from './widgets/StartHubConnectingToNetworkWidget';
import { SuccessWidget } from './widgets/SuccessWidget';
import { ValidatingConnectionWidget } from './widgets/ValidatingConnectionWidget';
import { VerifyingHubStateWidget } from './widgets/VerifyingHubStateWidget';
import { ViewWifiNetworkWidget } from './widgets/ViewWifiNetworkWidget';
import { WifiReconnectFailedWidget } from './widgets/WifiReconnectFailedWidget';

/**
 * Leave the flow, confirming first when leaving would strand the hardware. Back and every screen's
 * exit button come here, so they cannot disagree about whether leaving is safe.
 */
export function requestPairingExit(
  bloc: HubConnectionBloc,
  devicesBloc: () => DevicesBloc,
): void {
  if (pairingCanPop(bloc.state)) {
    devicesBloc().add(new GoToDevicesHomeScreen());
    return;
  }
  showPopupMessage({
    title: 'Stop Pairing?',
    message:
      'Your hub is part-way through setup. If you stop now it ' +
      'may not connect, and you will need to start again.',
    okayButtonLabel: 'Keep pairing',
    cancelButtonLabel: 'Stop pairing',
    onCancel: () => {
      popPopup();
      // Re-read on tap: the flow may have moved on (even to success) while the dialog was open.
      const freshState = bloc.state;
      if (pairingCanPop(freshState)) {
        devicesBloc().add(new GoToDevicesHomeScreen());
        return;
      }
      bloc.add(abandonEventFor(freshState));
    },
  });
}

/** The screen for each state; an unknown one throws, as in Flutter. */
function screenFor(
  state: HubConnectionState,
  firstTime: boolean,
): React.ReactElement {
  if (state instanceof BeginPairingHubState) {
    return <BeginPairingHubWidget />;
  }
  if (state instanceof InitialHubConnectionState) {
    return <InitialConnectionWidget />;
  }
  if (state instanceof ConnectingToHubState) {
    return <ConnectingToHubWidget />;
  }
  if (state instanceof VerifyingHubConnectionState) {
    return <ValidatingConnectionWidget />;
  }
  if (state instanceof ConnectedToHubState) {
    return <ListWifiNetworksWidget />;
  }
  if (state instanceof SelectedNetworkState) {
    return <ViewWifiNetworkWidget network={state.wifiNetwork} />;
  }
  if (state instanceof HubConnectingToWifiState) {
    return <StartHubConnectingToNetworkWidget />;
  }
  if (state instanceof CheckingIfHubConnectedToWifiState) {
    return (
      <CheckingIfHubConnectedToServerWidget
        startedAt={state.startedAt}
        reason={state.reason}
        showLightReadings={state.showLightReadings}
      />
    );
  }
  if (state instanceof HubConnectedToWifiSuccessfullyState) {
    return (
      <SuccessWidget message="Hub has successfully connected to the network." />
    );
  }
  if (state instanceof PairingStoppedState) {
    return <PairingStoppedWidget />;
  }
  if (state instanceof HubRevertedToAccessPointState) {
    return <HubRevertedWidget />;
  }
  if (state instanceof AnErrorOccurredState) {
    return (
      <FailureWidget
        message={state.errorMessage}
        detail={state.errorDetail}
        firstTime={firstTime}
        code={state.errorCode}
      />
    );
  }
  if (state instanceof SessionExpiredState) {
    return (
      <FailureWidget
        message={
          'Your session has expired.\n' +
          'Please sign in again to finish setting up your hub.'
        }
        firstTime={firstTime}
        code={HubRegistrationErrorCodes.sessionExpired}
      />
    );
  }
  if (state instanceof CheckingLightOfHubState) {
    return <VerifyingHubStateWidget />;
  }
  if (state instanceof ResettingHubWifiCredentialsState) {
    return <ResettingHubWidget />;
  }
  if (state instanceof CheckingHubIsPluggedInState) {
    return <CheckIfHubIsPluggedInWidget />;
  }
  if (state instanceof ReestablishConnectionToServerState) {
    return <ReestablishConnectionToServerWidget />;
  }
  if (state instanceof WifiReconnectFailedState) {
    return <WifiReconnectFailedWidget />;
  }
  if (state instanceof ReconnectToServerSuccessfullyState) {
    return <SuccessWidget message="Successfully reconnected to the server." />;
  }
  throw new Error(`State ${state.constructor.name} not recognized.`);
}

/** Below Flutter's SafeArea the padding it applied is gone (MediaQuery.removePadding). */
const noInsets = { top: 0, bottom: 0, left: 0, right: 0 };

type Props = {
  device: Device;
  /** Never set in Flutter (quirk Q38). */
  firstTime?: boolean;
  /** Tests only: a bloc of their own, kept open (BlocProvider.value). */
  bloc?: HubConnectionBloc;
};

export function HubConnectWidget({
  device,
  firstTime = false,
  bloc: givenBloc,
}: Props) {
  const readDevicesBloc = useReadDevicesBloc();
  // BlocProvider(create:): made once, closed when the wizard goes.
  const [bloc] = useState(() => givenBloc ?? new HubConnectionBloc(device));
  useEffect(
    () => () => {
      if (givenBloc === undefined) {
        bloc.close();
      }
    },
    [bloc, givenBloc],
  );
  const state = useSyncExternalStore(bloc.subscribe, bloc.getState);
  const exit = () => requestPairingExit(bloc, readDevicesBloc);

  return (
    <HubConnectionBlocProvider bloc={bloc}>
      <PopScope
        canPop={pairingCanPop(state)}
        onPopInvoked={didPop => {
          if (didPop) {
            readDevicesBloc().add(new GoToDevicesHomeScreen());
            return;
          }
          exit();
        }}
      >
        <SafeArea style={styles.expanded}>
          <SafeAreaInsetsContext.Provider value={noInsets}>
            <PairingStepContext.Provider value={pairingStepIndex(state)}>
              <PairingExitContext.Provider value={{ request: exit }}>
                {screenFor(state, firstTime)}
              </PairingExitContext.Provider>
            </PairingStepContext.Provider>
          </SafeAreaInsetsContext.Provider>
        </SafeArea>
      </PopScope>
    </HubConnectionBlocProvider>
  );
}

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
});
