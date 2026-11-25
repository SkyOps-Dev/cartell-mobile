// Port of frontend/lib/screens/devices/connect_hub_to_wifi/events/error_events.dart: the flow's
// one abandon path (stop everything, leave the hub's network, wait to reach the server again, then
// show the error), and "Try Reconnecting Again".

import { GenericPairToWifiException } from '../../../../services/exceptions';
import { reportError } from '../../../../services/reportError';
import type { Emitter } from '../../../../state/genericBloc';
import { UDPConnection } from '../../../../udpCommands/udpConnection';
import { futureDelayed } from '../../../../utilities/dartAsync';
import { ModeWatcherHelper } from '../../../../utilities/modeWatcher';
import type {
  HubConnectionBloc,
  HubConnectionEvent,
} from '../hubConnectionBloc';
import { HubWifi } from '../hubWifi';
import { ReconnectOutcome } from '../serverReachability';
import {
  AnErrorOccurredState,
  HubConnectionState,
  ReconnectToServerSuccessfullyState,
  ReestablishConnectionToServerState,
  WifiReconnectFailedState,
} from '../states';
import { awaitServerReachable } from '../utilities';
import { captureSummary } from './wifiConnectionEvents';

type Emit = Emitter<HubConnectionState>;

export class ErrorOccurredEvent implements HubConnectionEvent {
  readonly errorCode: string;
  /** The failure screen's headline. Short. */
  readonly errorMessage: string;
  /** Explanation under the headline, at body size. */
  readonly errorDetail: string | null;

  constructor({
    errorCode,
    errorMessage,
    errorDetail = null,
  }: {
    errorCode: string;
    errorMessage: string;
    errorDetail?: string | null;
  }) {
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.errorDetail = errorDetail;
  }

  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    // A teardown is already running (Cancel on the very screen this shows, or Back): a second
    // would clear and disconnect twice and race two outcomes. Its own flag, not a state, because
    // the reconnect retry shows the same state.
    if (bloc.teardownInFlight) {
      return;
    }
    bloc.teardownInFlight = true;
    try {
      emit(new ReestablishConnectionToServerState());

      bloc.timerManager.stopAll();

      // The poller is not a timer; an abandoned poll leaves its summary like any other ending.
      if (bloc.activePoller !== null) {
        captureSummary(bloc, bloc.activePoller, {
          outcome: 'error',
          errorCode: this.errorCode,
        });
      }
      bloc.activePoller?.cancel();
      bloc.activePoller = null;

      await futureDelayed(250);
      UDPConnection.clearConnection();
      await futureDelayed(250);
      await HubWifi.forceWifiUsage(false);
      await futureDelayed(250);
      await HubWifi.leaveHubNetwork();

      reportError(
        new GenericPairToWifiException(this.errorCode, this.errorMessage),
      );

      // Give the phone time to get back on its own network.
      await futureDelayed(3000);

      bloc.abandonRequested = false;
      const outcome = await awaitServerReachable({
        isCancelled: () => emit.isDone || bloc.abandonRequested,
      });
      // Only a closed window is a reconnect failure; a cancel goes on to the error.
      if (outcome === ReconnectOutcome.windowClosed) {
        if (emit.isDone) {
          return;
        }
        emit(new WifiReconnectFailedState());
        return;
      }

      // Back on a network that reaches the server: maintenance checks resume.
      ModeWatcherHelper.isPairingDevices = false;
      ModeWatcherHelper.currentState = 'active';

      if (emit.isDone) {
        return;
      }
      emit(
        new AnErrorOccurredState({
          errorMessage: this.errorMessage,
          errorCode: this.errorCode,
          errorDetail: this.errorDetail,
        }),
      );
    } finally {
      bloc.teardownInFlight = false;
    }
  }
}

/** "Try Reconnecting Again": leaves any Wi-Fi it is on, then waits to reach the server. */
export class ReestablishConnectionToServerEvent implements HubConnectionEvent {
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    // No debounce on the button: a second tap must not start a second loop.
    if (bloc.reconnectInFlight) {
      return;
    }
    bloc.reconnectInFlight = true;
    try {
      // Mainly for a phone still on the hub's network.
      if (await HubWifi.isConnected()) {
        await HubWifi.leaveHubNetwork();
      }

      if (supersededBy(bloc, emit)) {
        return;
      }
      emit(new ReestablishConnectionToServerState());

      await futureDelayed(250);

      bloc.abandonRequested = false;
      const outcome = await awaitServerReachable({
        isCancelled: () => supersededBy(bloc, emit) || bloc.abandonRequested,
      });
      if (outcome === ReconnectOutcome.cancelled) {
        return;
      }
      if (supersededBy(bloc, emit)) {
        return;
      }
      if (outcome === ReconnectOutcome.windowClosed) {
        emit(new WifiReconnectFailedState());
        return;
      }
      emit(new ReconnectToServerSuccessfullyState());
    } finally {
      bloc.reconnectInFlight = false;
    }
  }
}

/** A teardown (Cancel, Back) owns the outcome now, or the flow has closed. */
function supersededBy(bloc: HubConnectionBloc, emit: Emit): boolean {
  return bloc.teardownInFlight || emit.isDone;
}
