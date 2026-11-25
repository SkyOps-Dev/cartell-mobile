// Port of frontend/lib/screens/devices/connect_hub_to_wifi/events/hub_connection_events.dart:
// joining the hub's own network, checking the hub answers there (and telling it which server to
// use), then asking it which Wi-Fi networks it can see.
//
// One mechanism differs: dart:io's send throws a SocketException at once, react-native-udp's
// reports it a moment later, so failed sends are counted as their rejections arrive.

import { baseUrlWs } from '../../../../config/environment';
import { SocketException } from '../../../../services/exceptions';
import { ImmediateTimer } from '../../../../services/immediateTimer';
import { reportError } from '../../../../services/reportError';
import type { Emitter } from '../../../../state/genericBloc';
import {
  AbstractUdpCommand,
  GetFWVersion,
  ReadWebsocketUri,
  SaveWebsocketUri,
  ScanWifiNetworks,
  ScanWifiNetworksReply,
} from '../../../../udpCommands/commands';
import { Observer, UDPConnection } from '../../../../udpCommands/udpConnection';
import { futureDelayed } from '../../../../utilities/dartAsync';
import { ModeWatcherHelper } from '../../../../utilities/modeWatcher';
import {
  joinApprovalLabel,
  totalValidationMessages,
  validationMessagesPerSecond,
} from '../connectionConstants';
import type {
  HubConnectionBloc,
  HubConnectionEvent,
} from '../hubConnectionBloc';
import { HubWifi } from '../hubWifi';
import {
  AdvanceVerificationStage,
  describeVerificationTimeout,
  IgnoreVerificationMessage,
  interpretVerificationMessage,
  PairingErrorCodes,
  SucceedVerification,
  UnknownVerificationMessage,
  ValidatingConnectionStep,
} from '../pairingErrorCodes';
import {
  ConnectedToHubState,
  ConnectingToHubState,
  HubConnectionState,
  VerifyingHubConnectionState,
} from '../states';
import { ErrorOccurredEvent } from './errorEvents';
import { NetworkDiscoveredEvent } from './wifiNetworkEvents';

export { ValidatingConnectionStep };

type Emit = Emitter<HubConnectionState>;

/**
 * Joins the hub's network, routes traffic over it, opens the socket, then hands over to the
 * verification. None of the platform calls can be cancelled, so it checks at the end whether the
 * flow it was driving still exists.
 */
export class StartConnectionEvent implements HubConnectionEvent {
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    emit(new ConnectingToHubState());
    // Off its own network the phone cannot reach the server, so maintenance checks are paused.
    ModeWatcherHelper.isPairingDevices = true;
    ModeWatcherHelper.currentState = 'background';
    await HubWifi.joinHubNetwork(bloc.device.device.macAddress);

    await futureDelayed(500);

    await HubWifi.forceWifiUsage(true);

    await futureDelayed(500);

    UDPConnection.clearConnection();

    try {
      bloc.hubSocket = await UDPConnection.getInstance();
    } catch (error) {
      // A cancel during the bind lands here too: that is the flow ending as asked.
      if (!stillConnecting(bloc)) {
        return;
      }
      reportError(error);
      bloc.add(
        new ErrorOccurredEvent({
          errorMessage:
            'Could not open a connection to your hub.\n' + 'Please try again.',
          errorCode: PairingErrorCodes.socketUnavailable,
        }),
      );
      return;
    }

    // Cancelled while the bind ran: the socket goes too.
    if (!stillConnecting(bloc)) {
      UDPConnection.clearConnection();
      bloc.hubSocket = null;
      return;
    }
    bloc.add(new FinishedConnectingEvent());
  }
}

/** Whether StartConnectionEvent still owns the flow. */
function stillConnecting(bloc: HubConnectionBloc): boolean {
  return bloc.state instanceof ConnectingToHubState;
}

/**
 * Asks the hub its firmware version twice a second for up to 40 s. Its answer proves the phone
 * is on the hub's network; the hub is then told which server to use (three times, 120 ms apart)
 * and the wizard moves on.
 */
export class FinishedConnectingEvent
  implements HubConnectionEvent, Observer<AbstractUdpCommand>
{
  isVerified = false;
  numMessagesSent = 0;
  numSocketExceptions = 0;
  /** Anything arriving on the reply port, counted before it is interpreted. */
  numRepliesReceived = 0;
  private timer!: ImmediateTimer;
  private hubSocket!: UDPConnection;
  private bloc!: HubConnectionBloc;
  private currentStep = ValidatingConnectionStep.GettingFw;

  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    emit(new VerifyingHubConnectionState());
    this.bloc = bloc;
    // Flutter's `bloc.hubSocket!`.
    this.hubSocket = bloc.hubSocket as UDPConnection;

    await futureDelayed(1000);

    // A cancel inside that second must not start the timer against a closed socket.
    if (!(bloc.state instanceof VerifyingHubConnectionState)) {
      return;
    }

    this.hubSocket.addListener(this);
    this.timer = new ImmediateTimer({
      durationMs: Math.trunc(1000 / validationMessagesPerSecond),
      callback: timer => this.sendMessage(timer),
    });
    bloc.timerManager.addTimer({
      name: 'getFwVersionTimer',
      timer: this.timer,
    });
  }

  sendMessage(timer: ImmediateTimer): void {
    this.numMessagesSent++;
    if (this.numMessagesSent > totalValidationMessages) {
      const failure = describeVerificationTimeout({
        repliesReceived: this.numRepliesReceived,
        stage: this.currentStep,
        approvalLabel: joinApprovalLabel(),
      });
      // PORT-GAP: Sentry.addBreadcrumb(category 'pairing', 'verification timed out', data
      // {stage, messagesSent, repliesReceived, socketExceptions}, level error).
      this.bloc.add(
        new ErrorOccurredEvent({
          errorCode: failure.code,
          errorMessage: failure.message,
          errorDetail: failure.detail,
        }),
      );
      this.timer.cancel();
      this.hubSocket.removeListener(this);
      return;
    }
    let sent: Promise<void>;
    if (this.currentStep === ValidatingConnectionStep.GettingFw) {
      sent = this.hubSocket.send(GetFWVersion.generate());
    } else if (this.currentStep === ValidatingConnectionStep.GettingWsUrl) {
      sent = this.hubSocket.send(ReadWebsocketUri.generate());
    } else {
      // Back to back, and the read is not sent if the write failed (dart:io's order).
      sent = this.hubSocket
        .send(SaveWebsocketUri.generate())
        .then(() => this.hubSocket.send(ReadWebsocketUri.generate()));
    }
    sent.catch(error => this.sendFailed(error, timer));
  }

  /** Flutter's `on SocketException` around the sends; anything else is reported. */
  private sendFailed(error: unknown, timer: ImmediateTimer): void {
    if (!(error instanceof SocketException)) {
      reportError(error);
      return;
    }
    // A failure landing after the loop stopped (it settled, or this already gave up) is old news.
    if (!timer.isActive) {
      return;
    }
    this.numSocketExceptions++;
    const aReasonableNumberOfTries = 6; // totally arbitrary
    const hasFailedEverySingleMessageSoFar =
      this.numMessagesSent > aReasonableNumberOfTries &&
      this.numSocketExceptions === this.numMessagesSent;
    if (hasFailedEverySingleMessageSoFar) {
      this.bloc.add(
        new ErrorOccurredEvent({
          errorCode: '9d5a3474',
          errorMessage:
            "We weren't able to connect to your hub. \nPlease try again later.",
        }),
      );
      timer.cancel();
      return;
    }
    // Likely unreachable, as in Flutter.
    const hasFailedEnoughTimesToDisqualify =
      this.numSocketExceptions > 2 * aReasonableNumberOfTries;
    if (hasFailedEnoughTimesToDisqualify) {
      this.bloc.add(
        new ErrorOccurredEvent({
          errorCode: '8874c4b9',
          errorMessage: 'Connection is unreliable. \nPlease try again.',
        }),
      );
      timer.cancel();
    }
  }

  receive(message: AbstractUdpCommand): void {
    // Counted whatever it is: the timeout asks whether anything answered at all.
    this.numRepliesReceived++;
    const outcome = interpretVerificationMessage({
      message,
      currentStep: this.currentStep,
      isVerified: this.isVerified,
      shouldCheckWsUrl: this.shouldCheckWsUrl(),
      baseUrlWs: baseUrlWs(),
    });
    // PORT-GAP: Sentry.addBreadcrumb(category 'pairing', 'verification message <outcome>', data
    // {stage, messageType}, level error for an unknown message, info otherwise).
    if (outcome instanceof IgnoreVerificationMessage) {
      return;
    }
    if (outcome instanceof SucceedVerification) {
      if (outcome.writeWebsocketUri) {
        // The only place a release build tells the hub which server to use; it takes effect in
        // this same pairing (the hub reboots on joining the network). Twice more, spaced, because
        // this link drops datagrams and the write has no acknowledgement.
        this.sendWebsocketUri();
        for (let attempt = 1; attempt <= 2; attempt++) {
          setTimeout(() => this.sendWebsocketUri(), 120 * attempt);
        }
      }
      this.succeed();
      return;
    }
    if (outcome instanceof AdvanceVerificationStage) {
      this.currentStep = outcome.next;
      return;
    }
    if (outcome instanceof UnknownVerificationMessage) {
      this.bloc.add(
        new ErrorOccurredEvent({
          errorCode: PairingErrorCodes.unknownMessage,
          errorMessage:
            'The connection to your hub could not be verified. \nPlease try again.',
        }),
      );
      this.timer.cancel();
      this.hubSocket.removeListener(this);
    }
  }

  /** Best effort: a failed write never fails pairing. */
  private sendWebsocketUri(): void {
    try {
      this.hubSocket.send(SaveWebsocketUri.generate()).catch(error => {
        // PORT-GAP: log.i('Could not write the websocket URI; pairing anyway. $e').
        reportError(error);
      });
    } catch (error) {
      // PORT-GAP: log.i('Could not write the websocket URI; pairing anyway. $e').
      reportError(error);
    }
  }

  succeed(): void {
    this.timer.cancel();
    this.isVerified = true;
    this.bloc.add(new VerifiedConnectionEvent());
  }

  /**
   * Stages 2 and 3 (read the hub's server address, rewrite it if wrong) run in Flutter's debug
   * builds only (kDebugMode). Release behaviour is copied here in every build: stage 1, then the
   * write above.
   */
  shouldCheckWsUrl(): boolean {
    return false;
  }
}

/**
 * The hub is verified: ask it for the networks it can see every 10 s until it names one. (As in
 * Flutter, the loop is not tied to the flow: it stops only when a network has been heard.)
 */
export class VerifiedConnectionEvent
  implements HubConnectionEvent, Observer<AbstractUdpCommand>
{
  private bloc!: HubConnectionBloc;

  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    this.bloc = bloc;
    const hubSocket = bloc.hubSocket as UDPConnection;
    hubSocket.addListener(this);
    emit(new ConnectedToHubState());
    await futureDelayed(100);
    do {
      // A failed send ends the loop, as dart:io's throw does.
      await hubSocket.send(ScanWifiNetworks.generate());
      await futureDelayed(10_000);
    } while (bloc.wifiNetworks.size === 0);
  }

  receive(message: AbstractUdpCommand): void {
    if (message instanceof ScanWifiNetworksReply) {
      this.bloc.add(new NetworkDiscoveredEvent(message));
    }
  }
}
