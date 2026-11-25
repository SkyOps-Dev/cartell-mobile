// Port of frontend/lib/screens/devices/connect_hub_to_wifi/events/wifi_connection_events.dart:
// giving the hub the Wi-Fi name and password, leaving its network, and waiting for the server to
// report it online, with every way that wait can end.

import { AppState } from 'react-native';

import { probeHubRegistration } from '../../../../services/requests/deviceRequests';
import { reportError, reportMessage } from '../../../../services/reportError';
import type { Emitter } from '../../../../state/genericBloc';
import {
  AbstractUdpCommand,
  CheckandSaveEncryptedSSIDandPassword,
  ScanWifiNetworksReply,
} from '../../../../udpCommands/commands';
import { Observer, UDPConnection } from '../../../../udpCommands/udpConnection';
import { futureDelayed, PeriodicTimer } from '../../../../utilities/dartAsync';
import { ModeWatcherHelper } from '../../../../utilities/modeWatcher';
import {
  credentialSendInterval,
  credentialSendTimeout,
} from '../connectionConstants';
import {
  kAccessPointProbeTimeout,
  probeHubAccessPoint,
} from '../hubAccessPointProbe';
import type {
  HubConnectionBloc,
  HubConnectionEvent,
} from '../hubConnectionBloc';
import { isForegroundLifecycle, WaitingReason } from '../hubRegistrationCheck';
import { HubRegistrationPoller } from '../hubRegistrationPoller';
import { HubWifi } from '../hubWifi';
import { HubRegistrationErrorCodes } from '../pairingErrorCodes';
import { shouldAdvanceOnReply } from '../replyGuard';
import {
  CheckingIfHubConnectedToWifiState,
  HubConnectedToWifiSuccessfullyState,
  HubConnectingToWifiState,
  HubConnectionState,
  HubRevertedToAccessPointState,
  PairingStoppedState,
  SessionExpiredState,
} from '../states';
import { askHubForFirmwareVersion } from '../utilities';
import { ErrorOccurredEvent } from './errorEvents';

type Emit = Emitter<HubConnectionState>;

/**
 * Sends the encrypted Wi-Fi name and password every 4 s. The hub's first acknowledgement (a
 * receipt, not a verdict) moves on: the phone leaves the hub's network and the server is asked.
 * No acknowledgement after four sends ends in dbd39a14-b708.
 */
export class ConnectHubToWifiEvent
  implements HubConnectionEvent, Observer<AbstractUdpCommand>
{
  checkNumber = 0;
  numReceivedMessages = 0;
  private advanced = false;
  readonly totalNumberOfMessagesToSend = Math.trunc(
    credentialSendTimeout / credentialSendInterval,
  );
  private socket!: UDPConnection;
  private bloc!: HubConnectionBloc;
  private timer!: PeriodicTimer;

  constructor(
    readonly network: ScanWifiNetworksReply,
    readonly networkPassword: string,
  ) {}

  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    emit(new HubConnectingToWifiState());
    this.socket = bloc.hubSocket as UDPConnection;
    this.socket.addListener(this);
    this.bloc = bloc;
    this.timer = new PeriodicTimer(credentialSendInterval, timer =>
      this.sendMessage(timer),
    );
    bloc.timerManager.addTimer({
      name: 'checkAndSaveSsidAndPassword',
      timer: this.timer,
    });
  }

  sendMessage(timer: PeriodicTimer): void {
    if (this.checkNumber > this.totalNumberOfMessagesToSend) {
      this.giveUp(timer, '3b3cd169-f023');
      return;
    }
    if (
      this.checkNumber > this.totalNumberOfMessagesToSend * 0.75 &&
      this.numReceivedMessages === 0
    ) {
      this.giveUp(timer, 'dbd39a14-b708');
      return;
    }
    // PORT-GAP: debugPrint("Sending SSID #$checkNumber").
    this.checkNumber++;
    // A throw here (a password too long for the hub's field) goes to the error reporter and the
    // timer keeps running, as an uncaught error in a Dart timer does.
    try {
      this.socket
        .send(
          CheckandSaveEncryptedSSIDandPassword.generate({
            ssid: this.network.ssid,
            password: this.networkPassword,
          }),
        )
        .catch(reportError);
    } catch (error) {
      reportError(error);
    }
  }

  /** Detaches and marks itself advanced first, so a late reply cannot start a second poll. */
  private giveUp(timer: PeriodicTimer, errorCode: string): void {
    timer.cancel();
    this.socket.removeListener(this);
    this.advanced = true;
    this.bloc.add(
      new ErrorOccurredEvent({
        errorMessage:
          "We weren't able to connect to your hub. \nPlease try again later.",
        errorCode,
      }),
    );
  }

  receive(message: AbstractUdpCommand): void {
    if (!shouldAdvanceOnReply({ alreadyAdvanced: this.advanced, message })) {
      return;
    }
    // Only recognised replies count.
    this.numReceivedMessages++;
    this.advanced = true;
    this.timer.cancel();
    this.socket.removeListener(this);
    this.handOff();
  }

  private async handOff(): Promise<void> {
    // The acknowledgement's result is recorded, never branched on: it is a receipt (a hub given a
    // wrong password acknowledges with 1 too, measured 2026-09-01).
    // PORT-GAP: Sentry.addBreadcrumb(category 'pairing', 'credential ack received', data
    // {messageType, result: the reply's result}, level info).

    // The access-point probe counts from here, not from the poll's start.
    this.bloc.credentialAckAt = Date.now();

    // PORT-GAP: log.i('Credentials acknowledged; handing off to server confirmation').

    // Best effort: the hub already has the details, so a failing platform call says nothing about
    // whether pairing worked. The server confirmation is what answers that.
    try {
      await futureDelayed(2000);
      UDPConnection.clearConnection();
      await futureDelayed(1000);
      await HubWifi.forceWifiUsage(false);
      await futureDelayed(1000);
      await HubWifi.leaveHubNetwork();
      await futureDelayed(1000);
    } catch (error) {
      // PORT-GAP: log.i('Teardown after credential ack failed; confirming anyway. $e').
      reportError(error);
    }

    // Five seconds is ample time to have left the screen.
    if (this.bloc.isClosed) {
      return;
    }
    this.bloc.add(new StartCheckingIfHubConnectedToWifiEvent());
  }
}

/**
 * Waits for the server to report the hub online. A thin adapter: HubRegistrationPoller loops,
 * hubRegistrationCheck decides, and this turns their callbacks into events.
 */
export class StartCheckingIfHubConnectedToWifiEvent
  implements HubConnectionEvent
{
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    const startedAt = Date.now();
    bloc.startedAt = startedAt;
    emit(
      new CheckingIfHubConnectedToWifiState({
        startedAt,
        reason: WaitingReason.rejoiningNetwork,
      }),
    );

    const macAddress = bloc.device.device.macAddress;
    const poller = new HubRegistrationPoller({
      probe: () => probeHubRegistration(bloc.device),
      sleep: futureDelayed,
      // The app's real lifecycle, not ModeWatcherHelper's, which pairing holds at background.
      isForeground: () => isForegroundLifecycle(AppState.currentState),
      onWaiting: (reason, { showLightReadings = false } = {}) =>
        bloc.add(
          new HubStillRegisteringEvent({
            startedAt,
            reason,
            showLightReadings,
          }),
        ),
      onRegistered: () => bloc.add(new HubConnectedToWifiEvent()),
      onAuthExpired: () => bloc.add(new HubSessionExpiredEvent()),
      accessPointProbe: {
        // The poll's start only if the acknowledgement somehow went unstamped.
        sinceCredentialAckMs: () =>
          Date.now() - (bloc.credentialAckAt ?? startedAt),
        probe: () =>
          probeHubAccessPoint({
            join: async () => {
              // StartConnectionEvent's delays: the join known to work on hardware.
              await HubWifi.joinHubNetwork(macAddress);
              await futureDelayed(500);
              await HubWifi.forceWifiUsage(true);
              await futureDelayed(500);
              UDPConnection.clearConnection();
              bloc.hubSocket = await UDPConnection.getInstance();
            },
            ask: () =>
              askHubForFirmwareVersion(bloc.hubSocket as UDPConnection, {
                timeoutMs: kAccessPointProbeTimeout,
              }),
            leave: async () => {
              UDPConnection.clearConnection();
              bloc.hubSocket = null;
              await HubWifi.forceWifiUsage(false);
              await HubWifi.leaveHubNetwork();
            },
          }),
        onHubReverted: () => bloc.add(new HubRevertedToAccessPointEvent()),
      },
    });

    // A poll still running would otherwise be orphaned, probing forever.
    bloc.activePoller?.cancel();
    bloc.activePoller = poller;

    await poller.run();
  }
}

/** The poll's progress: the waiting screen again, with the latest reason. */
export class HubStillRegisteringEvent implements HubConnectionEvent {
  readonly startedAt: number;
  readonly reason: WaitingReason;
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
    this.startedAt = startedAt;
    this.reason = reason;
    this.showLightReadings = showLightReadings;
  }

  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(
      new CheckingIfHubConnectedToWifiState({
        startedAt: this.startedAt,
        reason: this.reason,
        showLightReadings: this.showLightReadings,
      }),
    );
  }
}

/** Cancel on the waiting screen. */
export class CancelWaitingForHubEvent implements HubConnectionEvent {
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    // Success arrives a moment after the hub registers; a tap in that moment changes nothing.
    if (!(bloc.state instanceof CheckingIfHubConnectedToWifiState)) {
      return;
    }

    const poller = bloc.activePoller;
    poller?.cancel();
    bloc.timerManager.stopAll();

    ModeWatcherHelper.isPairingDevices = false;
    ModeWatcherHelper.currentState = 'active';

    captureSummary(bloc, poller, {
      outcome: 'cancelled',
      errorCode: HubRegistrationErrorCodes.cancelledWhileWaiting,
    });
    bloc.activePoller = null;

    emit(new PairingStoppedState());
  }
}

/**
 * One summary per poll, from every way it ends (registered, cancelled, auth_expired,
 * ap_reverted, error), for Sentry.
 */
export function captureSummary(
  bloc: HubConnectionBloc,
  poller: HubRegistrationPoller | null,
  { outcome, errorCode }: { outcome: string; errorCode?: string },
): void {
  const startedAt = bloc.startedAt;
  const elapsedSeconds =
    startedAt === null ? null : Math.floor((Date.now() - startedAt) / 1000);
  const unavailableCounts: Record<string, number> = {};
  for (const [reason, count] of poller?.unavailableCounts ?? []) {
    unavailableCounts[reason] = count;
  }
  reportMessage(`hub pairing registration poll ended: ${outcome}`, {
    hub_pairing: {
      outcome,
      // Only an outcome that is an error carries a code.
      ...(errorCode !== undefined ? { error_code: errorCode } : {}),
      device_id: bloc.device.id,
      completed_checks: poller?.completedChecks ?? 0,
      ever_reached_server: poller?.everReachedServer ?? false,
      elapsed_seconds: elapsedSeconds,
      unavailable_counts: unavailableCounts,
    },
  });
}

export class HubConnectedToWifiEvent implements HubConnectionEvent {
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    // Cancel may already have settled this poll.
    if (!(bloc.state instanceof CheckingIfHubConnectedToWifiState)) {
      return;
    }

    bloc.timerManager.stopAll();
    ModeWatcherHelper.isPairingDevices = false;
    ModeWatcherHelper.currentState = 'active';
    captureSummary(bloc, bloc.activePoller, { outcome: 'registered' });
    bloc.activePoller = null;
    emit(new HubConnectedToWifiSuccessfullyState());
  }
}

/** The poll ended because the session died (the poller has already stopped itself). */
export class HubSessionExpiredEvent implements HubConnectionEvent {
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    if (!(bloc.state instanceof CheckingIfHubConnectedToWifiState)) {
      return;
    }

    bloc.timerManager.stopAll();
    ModeWatcherHelper.isPairingDevices = false;
    ModeWatcherHelper.currentState = 'active';

    captureSummary(bloc, bloc.activePoller, {
      outcome: 'auth_expired',
      errorCode: HubRegistrationErrorCodes.sessionExpired,
    });
    bloc.activePoller = null;

    emit(new SessionExpiredState());
  }
}

/**
 * The probe found the hub back on its own network: the details failed. Which of the causes (a
 * wrong password, out of range, the router down) cannot be told from here.
 */
export class HubRevertedToAccessPointEvent implements HubConnectionEvent {
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    if (!(bloc.state instanceof CheckingIfHubConnectedToWifiState)) {
      return;
    }

    bloc.timerManager.stopAll();
    ModeWatcherHelper.isPairingDevices = false;
    ModeWatcherHelper.currentState = 'active';

    captureSummary(bloc, bloc.activePoller, {
      outcome: 'ap_reverted',
      errorCode: HubRegistrationErrorCodes.hubRevertedToAccessPoint,
    });
    bloc.activePoller = null;

    emit(new HubRevertedToAccessPointState());
  }
}
