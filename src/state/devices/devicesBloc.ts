// Port of the DevicesBloc (frontend/lib/bloc/devices/*; spec 06 §5): the state machine of the
// hubs area, inside the signed-in shell. A new one is made each time the shell shows the Hubs
// state (MainAppRouter.tsx).
//
// Built so far: the loading, Hubs-list, Add Hub, hub-added, hub, rename, About and Hub settings
// states; GoToDevicesHomeScreen, RefreshDevices, GoToAddAHubScreen, GoToAddHubSuccessScreen,
// GoToSpecificDeviceEvent, GoToEditDeviceScreen, GoToAboutDeviceScreen, GoToDeviceSettingsEvent
// and the error recovery.
// PORT-GAP: GoBackNDevicesStatesEvent, and the other states and events, which arrive with the
// screens they show (sensors, firmware, pairing, history).

import type { Device } from '../../models/device';
import { AuthRequestManager } from '../../services/requests/authRequests';
import {
  fetchDevices,
  setDevice,
} from '../../services/requests/deviceRequests';
import { AutoLoginEvent } from '../auth/authBloc';
import {
  Emitter,
  emitThenRefresh,
  GenericBloc,
  GenericEvent,
  GenericState,
  RefreshState,
  stateTimestamp,
} from '../genericBloc';
import type { MainAppBloc } from '../mainApp/mainAppBloc';

// --- states ------------------------------------------------------------------------------

export abstract class DevicesState extends GenericState {}

/** The loading screen. Not poppable. */
export class IsLoadingDevicesScreenState extends DevicesState {
  readonly timestamp = stateTimestamp();
  constructor() {
    super(false);
  }

  get props() {
    return [...super.props, this.timestamp];
  }
}

/** The Hubs list. */
export class IsOnDevicesHomeScreenState extends DevicesState {
  readonly timestamp = stateTimestamp();
  constructor(readonly devices: Device[]) {
    super();
  }

  get props() {
    return [...super.props, this.timestamp, this.devices];
  }
}

/** Add Hub (AddDevice). Has no props of its own, so a second one equals the first. */
export class IsAddingAHubState extends DevicesState {}

/** "Hub Added to Account!" (SuccessfullyAddedDeviceScreen). Not poppable. */
export class IsOnAddHubSuccessScreen extends DevicesState {
  constructor(readonly device: Device) {
    super(false);
  }

  get props() {
    return [...super.props, this.device];
  }
}

/** One hub's page (DeviceView). Not poppable. */
export class IsShowingADeviceState extends DevicesState {
  constructor(
    readonly device: Device,
    readonly refresh: RefreshState = RefreshState.ready,
  ) {
    super(false);
  }

  get props() {
    return [...super.props, this.device, this.refresh];
  }
}

/** Rename Hub (EditDevice). Not poppable. */
export class IsOnEditDeviceScreen extends DevicesState {
  constructor(readonly device: Device) {
    super(false);
  }

  get props() {
    return [...super.props, this.device];
  }
}

/** The hub's About page (DeviceMeta). */
export class IsOnAboutDeviceScreenState extends DevicesState {
  constructor(
    readonly device: Device,
    readonly refresh: RefreshState = RefreshState.ready,
  ) {
    super();
  }

  get props() {
    return [...super.props, this.device, this.refresh];
  }
}

/** Hub settings (DeviceSettingsScreen). Not poppable. */
export class IsOnDeviceSettingsScreen extends DevicesState {
  constructor(
    readonly device: Device,
    readonly refresh: RefreshState = RefreshState.ready,
  ) {
    super(false);
  }

  get props() {
    return [...super.props, this.device, this.refresh];
  }
}

// --- bloc --------------------------------------------------------------------------------

const MAX_RECOVERY_ATTEMPTS = 3;

export class DevicesBloc extends GenericBloc<DevicesState> {
  /** Consecutive failed recovery attempts; reset once a fetch succeeds. */
  recoveryAttempts = 0;

  constructor(readonly parentBloc: MainAppBloc, public devices: Device[]) {
    super(
      new IsLoadingDevicesScreenState(),
      new IsOnDevicesHomeScreenState(devices),
    );
    // flutter_bloc handles an added event asynchronously, so the first frame always shows the
    // starting (loading) state; with a list from sign-in the Hubs screen then fades in over it.
    queueMicrotask(() => this.add(new GoToDevicesHomeScreen()));
  }

  /**
   * Recovery outlives the event that started it (GenericBloc does not wait for it), across an auth
   * round trip and a backoff of up to three seconds, so every dispatch is guarded: a user who hits
   * an outage is exactly the user who leaves the screen, and the bloc closes underneath it.
   */
  protected onErrorDuringEventHandle(error: unknown): void {
    super.onErrorDuringEventHandle(error);
    this.recover();
  }

  /** onErrorDuringEventHandle's recovery, exposed for the ported recovery_after_close test. */
  async recover(): Promise<void> {
    const result = await new AuthRequestManager().auth({
      shouldForceAuth: true,
    });
    if (result.failed) {
      if (this.parentBloc.parentBloc.isClosed) {
        return;
      }
      this.parentBloc.parentBloc.add(new AutoLoginEvent());
      return;
    }
    if (this.isClosed) {
      return;
    }
    // Each pass re-runs GoToDevicesHomeScreen, whose fetch throws again during an outage and lands
    // back here, so the attempts are counted and spaced 1, 2, 3 s apart.
    this.recoveryAttempts++;
    if (this.recoveryAttempts > MAX_RECOVERY_ATTEMPTS) {
      // PORT-GAP: mainLogger.e("Giving up after 3 recovery attempts; leaving the screen as-is.").
      return;
    }
    await new Promise<void>(resolve =>
      setTimeout(resolve, this.recoveryAttempts * 1000),
    );
    if (this.isClosed) {
      return;
    }
    this.add(new GoToDevicesHomeScreen());
  }
}

export type DevicesEvent = GenericEvent<DevicesState, DevicesBloc>;

// --- events ------------------------------------------------------------------------------

/**
 * Renders the hubs list from the last known set, then revalidates. The first load has nothing to
 * show yet and waits on the loading screen.
 */
export class GoToDevicesHomeScreen implements DevicesEvent {
  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    const pending: DevicesState =
      bloc.devices.length === 0
        ? new IsLoadingDevicesScreenState()
        : new IsOnDevicesHomeScreenState(bloc.devices);
    emit(pending);

    const devices = await fetchDevices();
    bloc.devices = devices;
    // Got through, so the recovery budget resets for the next outage.
    bloc.recoveryAttempts = 0;

    // The list renders at once, so the user may already have moved on when this lands.
    if (emit.isDone || bloc.state !== pending) {
      return;
    }
    emit(new IsOnDevicesHomeScreenState(devices));
  }
}

/**
 * Pull-to-refresh on the Hubs list: fetch, keep the list, and show it again with no loading
 * screen. The state carries a new timestamp, so the screen redraws even when nothing changed.
 */
export class RefreshDevices implements DevicesEvent {
  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    const devices = await fetchDevices();
    bloc.devices = devices;
    emit(new IsOnDevicesHomeScreenState(devices));
  }
}

/**
 * Tapping a hub card: the hub's page at once from the hub in hand ("Checking..."), then again once
 * the hub has been fetched (or as last known if that failed).
 */
export class GoToSpecificDeviceEvent implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    await emitThenRefresh(
      emit,
      () => bloc.state,
      refresh => new IsShowingADeviceState(this.device, refresh),
      () => setDevice(this.device.id),
    );
  }
}

/**
 * Rename Hub, from the model in hand with no re-check: the name field starts from it, and a
 * re-check landing while the user types would overwrite what they entered.
 */
export class GoToEditDeviceScreen implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsOnEditDeviceScreen(this.device));
  }
}

/** About: at once from the hub in hand ("Checking..."), then again once it has been fetched. */
export class GoToAboutDeviceScreen implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    await emitThenRefresh(
      emit,
      () => bloc.state,
      refresh => new IsOnAboutDeviceScreenState(this.device, refresh),
      () => setDevice(this.device.id),
    );
  }
}

/** Hub settings: at once from the hub in hand ("Checking..."), then again once it is fetched. */
export class GoToDeviceSettingsEvent implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    await emitThenRefresh(
      emit,
      () => bloc.state,
      refresh => new IsOnDeviceSettingsScreen(this.device, refresh),
      () => setDevice(this.device.id),
    );
  }
}

/** The + button and the ⋮ menu's "Add Hub" on the Hubs screen. */
export class GoToAddAHubScreen implements DevicesEvent {
  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsAddingAHubState());
  }
}

/** Once a hub has been registered and fetched (Add Hub's Submit). */
export class GoToAddHubSuccessScreen implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsOnAddHubSuccessScreen(this.device));
  }
}
