// Port of frontend/lib/screens/devices/connect_hub_to_wifi/bloc.dart: the pairing wizard's bloc,
// for one hub. Its events (events/*) hold the logic; this holds what they share. Also
// HubConnectionEvent, the events' type (frontend/lib/screens/devices/connect_hub_to_wifi/events/hub_event.dart).
// frontend/lib/screens/devices/connect_hub_to_wifi/connect_hub.dart is the Dart library that joins
// the wizard's files together as parts; TypeScript modules import each other and need no such file.
//
// Flutter registers each event with setHandler and an unregistered one throws when added. Here
// GenericBloc runs any event's handleEvent, so there is no list to forget to append to.

import type { Device } from '../../../models/device';
import { GenericBloc, GenericEvent } from '../../../state/genericBloc';
import type { ScanWifiNetworksReply } from '../../../udpCommands/commands';
import type { UDPConnection } from '../../../udpCommands/udpConnection';
import { ModeWatcherHelper } from '../../../utilities/modeWatcher';
import type { HubRegistrationPoller } from './hubRegistrationPoller';
import { BeginPairingHubState, HubConnectionState } from './states';
import { TimerManager } from './timerManager';

export type HubConnectionEvent = GenericEvent<
  HubConnectionState,
  HubConnectionBloc
>;

export class HubConnectionBloc extends GenericBloc<HubConnectionState> {
  hubSocket: UDPConnection | null = null;

  /**
   * The running registration poller, so Cancel can stop it; null outside the confirmation stage.
   * Every terminal path sets it back to null: ErrorOccurredEvent decides whether to report a
   * summary by whether it is set.
   */
  activePoller: HubRegistrationPoller | null = null;

  /** True while ErrorOccurredEvent's teardown runs (its own guard, not a state). */
  teardownInFlight = false;

  /** True while ReestablishConnectionToServerEvent's retry loop runs. */
  reconnectInFlight = false;

  /** Set by Cancel when a teardown already owns the flow; ends the reconnect wait. */
  abandonRequested = false;

  /** When the current confirmation poll started (ms since the epoch). */
  startedAt: number | null = null;

  /** When the hub acknowledged the credentials: the access-point probe counts from here. */
  credentialAckAt: number | null = null;

  readonly timerManager = new TimerManager();

  /** The networks the hub found, by name, in the order first heard. */
  wifiNetworks = new Map<string, ScanWifiNetworksReply>();

  /** Which scan wifiNetworks belongs to; bumped by a refresh, so the list can tell them apart. */
  scanGeneration = 0;

  constructor(readonly device: Device) {
    const start = new BeginPairingHubState();
    super(start, start);
  }

  /**
   * Leaving the flow: the poll stops (nothing else would, and it has no deadline) and
   * maintenance-mode checks resume. ModeWatcherHelper.currentState is left alone: it belongs to
   * the app's lifecycle, and this can run in the background. No summary is reported here; the
   * success and cancel paths already did.
   */
  close(): void {
    this.activePoller?.cancel();
    this.activePoller = null;
    ModeWatcherHelper.isPairingDevices = false;
    super.close();
  }
}
