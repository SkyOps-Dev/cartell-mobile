// Port of frontend/lib/screens/devices/connect_hub_to_wifi/events/wifi_network_events.dart: the
// networks the hub reports, a fresh scan, and the user's pick.

import type { Emitter } from '../../../../state/genericBloc';
import {
  ScanWifiNetworks,
  ScanWifiNetworksReply,
} from '../../../../udpCommands/commands';
import type { UDPConnection } from '../../../../udpCommands/udpConnection';
import type {
  HubConnectionBloc,
  HubConnectionEvent,
} from '../hubConnectionBloc';
import {
  ConnectedToHubState,
  HubConnectionState,
  SelectedNetworkState,
} from '../states';

type Emit = Emitter<HubConnectionState>;

/** One network the hub can see, kept by name; the list redraws if it is on screen. */
export class NetworkDiscoveredEvent implements HubConnectionEvent {
  constructor(readonly message: ScanWifiNetworksReply) {}

  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    bloc.wifiNetworks.set(this.message.ssid, this.message);
    if (bloc.state instanceof ConnectedToHubState) {
      emit(new ConnectedToHubState());
    }
  }
}

/** Forgets the networks heard and asks the hub to scan again. */
export class RefreshHubWifiNetworksEvent implements HubConnectionEvent {
  async handleEvent(bloc: HubConnectionBloc, emit: Emit) {
    bloc.wifiNetworks = new Map();
    // A new scan from an empty list leaves the map empty before and after; this tells them apart.
    bloc.scanGeneration += 1;
    // A failed send stops here, before the redraw, as dart:io's throw does.
    await (bloc.hubSocket as UDPConnection).send(ScanWifiNetworks.generate());
    emit(new ConnectedToHubState());
  }
}

export class SelectWifiNetworkEvent implements HubConnectionEvent {
  constructor(readonly wifiNetwork: ScanWifiNetworksReply) {}

  async handleEvent(_bloc: HubConnectionBloc, emit: Emit) {
    emit(new SelectedNetworkState(this.wifiNetwork));
  }
}
