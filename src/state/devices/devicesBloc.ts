// Port of the DevicesBloc (frontend/lib/bloc/devices/*; spec 06 §5): the state machine of the
// hubs area, inside the signed-in shell. A new one is made each time the shell shows the Hubs
// state (MainAppRouter.tsx).
//
// Built so far: the loading and Hubs-list states, GoToDevicesHomeScreen and the error recovery.
// LATER(part 24): RefreshDevices (pull-to-refresh: fetch, keep the list, emit the Hubs list with no
// loading screen) and GoBackNDevicesStatesEvent; the other states and events arrive with the
// screens they show (hub detail, sensors, firmware, add hub, pairing, history).

import { AuthRequestManager } from '../../services/requests/authRequests';
import {
  fetchDevices,
  RawDevice,
} from '../../services/requests/deviceRequests';
import { AutoLoginEvent } from '../auth/authBloc';
import {
  Emitter,
  GenericBloc,
  GenericEvent,
  GenericState,
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

/** The Hubs list. LATER(part 24): RawDevice becomes the Device model. */
export class IsOnDevicesHomeScreenState extends DevicesState {
  readonly timestamp = stateTimestamp();
  constructor(readonly devices: RawDevice[]) {
    super();
  }

  get props() {
    return [...super.props, this.timestamp, this.devices];
  }
}

// --- bloc --------------------------------------------------------------------------------

const MAX_RECOVERY_ATTEMPTS = 3;

export class DevicesBloc extends GenericBloc<DevicesState> {
  /** Consecutive failed recovery attempts; reset once a fetch succeeds. */
  recoveryAttempts = 0;

  constructor(readonly parentBloc: MainAppBloc, public devices: RawDevice[]) {
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
      // LATER(part 2): mainLogger.e("Giving up after 3 recovery attempts; leaving the screen as-is.").
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
