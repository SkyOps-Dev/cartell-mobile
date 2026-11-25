// Port of the DevicesBloc (frontend/lib/bloc/devices/*; spec 06 §5, spec 13): the state machine of the
// hubs area, inside the signed-in shell. A new one is made each time the shell shows the Hubs
// state (MainAppRouter.tsx).
//
// Built so far: the loading, Hubs-list, Add Hub, hub-added, hub, rename, About and Hub settings
// states; GoToDevicesHomeScreen, RefreshDevices, GoToAddAHubScreen, GoToAddHubSuccessScreen,
// GoToSpecificDeviceEvent, GoToEditDeviceScreen, GoToAboutDeviceScreen, GoToDeviceSettingsEvent
// and the error recovery. The sensor screens' states and events (sensors list, sensor page, its
// rename, coordinates and About, and the three Add Sensor steps). The hub's and the sensor's
// event history. The Firmware screen and an update's progress.
// The pairing wizard's state and GoToConnectHubBloc.
// PORT-GAP: GoBackNDevicesStatesEvent (bloc/devices/events/go_back_n_states_event.dart).

import { baseUrlHttp } from '../../config/environment';
import type { Device } from '../../models/device';
import { Event } from '../../models/event';
import type { Firmware, FirmwareUpdate } from '../../models/firmware';
import type { Sensor } from '../../models/sensor';
import type { AddSensorData } from '../../screens/sensors/addSensor/AddSensor';
import { AuthRequestManager } from '../../services/requests/authRequests';
import {
  fetchDevices,
  setDevice,
} from '../../services/requests/deviceRequests';
import {
  setDeviceEvents,
  setSensorEventData,
} from '../../services/requests/eventRequests';
import {
  checkForRunningFirmwareUpdate,
  getLatestESP32APPFirmware,
  getLatestRFM6601APPFirmware,
} from '../../services/requests/firmwareRequests';
import { setSensor } from '../../services/requests/sensorRequests';
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

/** The hub Wi-Fi pairing wizard (HubConnectWidget), for this hub. Poppable. */
export class IsConnectingHubState extends DevicesState {
  constructor(readonly device: Device) {
    super();
  }

  get props() {
    return [...super.props, this.device];
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

/**
 * A hub's Sensors list (SensorsScreen). Its RefreshState is not drawn, but it makes the second
 * emit (after the hub is fetched again) differ from the first, so the refreshed list repaints.
 */
export class IsOnSensorsScreenState extends DevicesState {
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

/** One sensor's page (SensorView). */
export class IsOnSpecificSensorScreenState extends DevicesState {
  constructor(
    readonly device: Device,
    readonly sensor: Sensor,
    readonly refresh: RefreshState = RefreshState.ready,
  ) {
    super();
  }

  get props() {
    return [...super.props, this.device, this.sensor, this.refresh];
  }
}

/** A hub's event history (DeviceHistory). `checking` while the first page is fetched. */
export class IsOnSpecificDeviceHistoryScreenState extends DevicesState {
  constructor(
    readonly event: Event,
    readonly device: Device,
    readonly refresh: RefreshState = RefreshState.ready,
  ) {
    super();
  }

  get props() {
    return [...super.props, this.device, this.event, this.refresh];
  }
}

/** A sensor's event history (SensorHistory). `checking` while the first page is fetched. */
export class IsOnSpecificSensorHistoryScreenState extends DevicesState {
  constructor(
    readonly device: Device,
    readonly sensor: Sensor,
    readonly event: Event,
    readonly refresh: RefreshState = RefreshState.ready,
  ) {
    super();
  }

  get props() {
    return [...super.props, this.device, this.sensor, this.event, this.refresh];
  }
}

/** Edit Coordinates (EditCoordinates). Not poppable. */
export class IsEditingSensorCoordinatesState extends DevicesState {
  constructor(readonly device: Device, readonly sensor: Sensor) {
    super(false);
  }

  get props() {
    return [...super.props, this.device, this.sensor];
  }
}

/** A sensor's About page (SensorMeta). Its RefreshState is not drawn (see the Sensors list's). */
export class IsOnSensorAboutScreenState extends DevicesState {
  constructor(
    readonly device: Device,
    readonly sensor: Sensor,
    readonly refresh: RefreshState = RefreshState.ready,
  ) {
    super();
  }

  get props() {
    return [...super.props, this.device, this.sensor, this.refresh];
  }
}

/** Rename Sensor (EditSensor). Not poppable. */
export class IsOnEditSensorScreenState extends DevicesState {
  constructor(readonly device: Device, readonly sensor: Sensor) {
    super(false);
  }

  get props() {
    return [...super.props, this.device, this.sensor];
  }
}

/** A hub's Firmware screen (FirmwareUpdates): the offers, or the update already running. */
export class IsOnDeviceFirmwareUpdatesScreen extends DevicesState {
  constructor(
    readonly device: Device,
    readonly espUpdate: Firmware | null = null,
    readonly rfmUpdate: Firmware | null = null,
    readonly currentRunning: FirmwareUpdate | null = null,
  ) {
    super();
  }

  get props() {
    return [
      ...super.props,
      this.device,
      this.espUpdate,
      this.rfmUpdate,
      this.currentRunning,
    ];
  }
}

/** An update's progress (UpdateDeviceScreen); `resumeUpdateId` adopts one already running. */
export class IsUpdatingDeviceFirmwareState extends DevicesState {
  constructor(
    readonly device: Device,
    readonly firmware: Firmware,
    readonly resumeUpdateId: number | null = null,
  ) {
    super();
  }

  get props() {
    return [...super.props, this.device, this.firmware, this.resumeUpdateId];
  }
}

/** Add Sensor, step 1: the name (AddSensor). Not poppable. */
export class IsAddingASensorName extends DevicesState {
  constructor(readonly device: Device) {
    super(false);
  }

  get props() {
    return [...super.props, this.device];
  }
}

/** Add Sensor, step 2: "Prepare to add" (RemoveCaseForAddSensor). Not poppable. */
export class IsRemovingCaseForAddSensor extends DevicesState {
  constructor(readonly device: Device, readonly data: AddSensorData) {
    super(false);
  }

  get props() {
    return [...super.props, this.device, this.data];
  }
}

/** Add Sensor, step 3: the search (SensorConnectScreen). Not poppable. */
export class IsOnSensorConnectScreen extends DevicesState {
  constructor(readonly device: Device, readonly data: AddSensorData) {
    super(false);
  }

  get props() {
    return [...super.props, this.device, this.data];
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
 * Into the pairing wizard (frontend/lib/bloc/devices/events/go_to_connect_hub_bloc.dart):
 * deliberately fetch-first, unlike every
 * other navigation. The loading screen, then the hub fetched fresh (setDevice: the health request,
 * then the hub), then the wizard. On Django for now, as the whole wizard is.
 */
export class GoToConnectHubBloc implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsLoadingDevicesScreenState());
    const refreshedDevice = await setDevice(this.device.id, baseUrlHttp());
    emit(new IsConnectingHubState(refreshedDevice));
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

/**
 * The hub page's Sensors button, and back from any sensor screen: the list at once from the hub
 * in hand, then again once the hub (with its sensors) has been fetched.
 */
export class GoToSensorsScreenEvent implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    await emitThenRefresh(
      emit,
      () => bloc.state,
      refresh => new IsOnSensorsScreenState(this.device, refresh),
      () => setDevice(this.device.id),
    );
  }
}

/** Tapping a sensor's card: its page at once ("Checking..."), then again once it is fetched. */
export class GoToSpecificSensorScreenEvent implements DevicesEvent {
  constructor(readonly device: Device, readonly sensor: Sensor) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    await emitThenRefresh(
      emit,
      () => bloc.state,
      refresh =>
        new IsOnSpecificSensorScreenState(this.device, this.sensor, refresh),
      () => setSensor({ deviceID: this.device.id, sensorID: this.sensor.id }),
    );
  }
}

/**
 * A sensor's About: at once, then again once the hub and the sensor (two independent reads, side
 * by side) have both been fetched.
 */
export class GoToSpecificSensorAboutScreen implements DevicesEvent {
  constructor(readonly device: Device, readonly sensor: Sensor) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    await emitThenRefresh(
      emit,
      () => bloc.state,
      refresh =>
        new IsOnSensorAboutScreenState(this.device, this.sensor, refresh),
      () =>
        Promise.all([
          setDevice(this.device.id),
          setSensor({ deviceID: this.device.id, sensorID: this.sensor.id }),
        ]),
    );
  }
}

/**
 * frontend/lib/bloc/devices/events/go_to_specific_device_history_event.dart.
 * The hub page's History: the screen at once with an empty Event (`checking`, only the list
 * waits), then the first page. Leaving meanwhile is respected; a failed fetch goes to the error
 * recovery.
 */
export class GoToSpecificDeviceHistoryEvent implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    const pending = new IsOnSpecificDeviceHistoryScreenState(
      new Event(),
      this.device,
      RefreshState.checking,
    );
    emit(pending);

    const event = await setDeviceEvents({ deviceID: this.device.id });

    if (emit.isDone || bloc.state !== pending) {
      return;
    }
    emit(new IsOnSpecificDeviceHistoryScreenState(event, this.device));
  }
}

/**
 * frontend/lib/bloc/devices/events/go_to_sensor_history_event.dart.
 * The sensor page's View History: the screen at once (`checking`), then the sensor and its first
 * page, fetched side by side. Like Dart's record `.wait`, both finish before a failure is raised
 * (to the error recovery). Leaving meanwhile is respected.
 */
export class GoToSensorHistoryEvent implements DevicesEvent {
  constructor(readonly device: Device, readonly sensor: Sensor) {}

  async handleEvent(bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    const pending = new IsOnSpecificSensorHistoryScreenState(
      this.device,
      this.sensor,
      new Event(),
      RefreshState.checking,
    );
    emit(pending);

    const [sensor, event] = await Promise.allSettled([
      setSensor({ deviceID: this.device.id, sensorID: this.sensor.id }),
      setSensorEventData({ sensor: this.sensor }),
    ]);
    if (sensor.status === 'rejected') {
      throw sensor.reason;
    }
    if (event.status === 'rejected') {
      throw event.reason;
    }

    if (emit.isDone || bloc.state !== pending) {
      return;
    }
    emit(
      new IsOnSpecificSensorHistoryScreenState(
        this.device,
        sensor.value,
        event.value,
      ),
    );
  }
}

/** Rename Sensor, from the models in hand with no re-check (an editor; see GoToEditDeviceScreen). */
export class GoToEditSensorScreen implements DevicesEvent {
  constructor(readonly device: Device, readonly sensor: Sensor) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsOnEditSensorScreenState(this.device, this.sensor));
  }
}

/** Edit Coordinates, from the models in hand with no re-check (an editor). */
export class GoToEditSensorLocationScreen implements DevicesEvent {
  constructor(readonly device: Device, readonly sensor: Sensor) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsEditingSensorCoordinatesState(this.device, this.sensor));
  }
}

/** Add Sensor's first step (the + button, and ⋮ → Pair Sensor): the name field, at once. */
export class GoToAddSensorStart implements DevicesEvent {
  constructor(readonly device: Device) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsAddingASensorName(this.device));
  }
}

/** Add Sensor's Continue: "Prepare to add". */
export class GoToIsRemovingCaseForAddSensor implements DevicesEvent {
  constructor(readonly device: Device, readonly data: AddSensorData) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsRemovingCaseForAddSensor(this.device, this.data));
  }
}

/** "I see the red button!": the search. */
export class GoToSensorConnectScreen implements DevicesEvent {
  constructor(readonly device: Device, readonly data: AddSensorData) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsOnSensorConnectScreen(this.device, this.data));
  }
}

/** Dart's `!` on a null value. */
function nullCheck<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new TypeError('Null check operator used on a null value');
  }
  return value;
}

/**
 * frontend/lib/bloc/devices/events/go_to_device_firmware_updates_event.dart.
 * The hub page's Firmware Updates (and ⋮ → Check for updates; back from an update): the loading
 * screen, then the hub, the two latest firmwares and the running-update check, side by side. Like
 * Dart's record `.wait`, all four finish before a failure is raised (to the error recovery). Quirks
 * copied: an empty `latest-*` list throws, and so does a hub with no reported version.
 */
export class GoToDeviceFirmwareUpdatesEvent implements DevicesEvent {
  constructor(readonly deviceId: number) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(new IsLoadingDevicesScreenState());

    const reads = [
      setDevice(this.deviceId),
      getLatestESP32APPFirmware(),
      getLatestRFM6601APPFirmware(),
      checkForRunningFirmwareUpdate(this.deviceId),
    ] as const;
    // Every read settles first; then the first failure (in this order) is raised.
    await Promise.allSettled(reads);
    const [device, latestESP, latestRFM, currentRunningUpdate] =
      await Promise.all(reads);

    const meta = device.device;
    const espUpdate =
      nullCheck(meta.esp32AppVersion) < nullCheck(latestESP.versionNumber)
        ? latestESP
        : null;
    const rfmUpdate =
      nullCheck(meta.rfm6601AppVersion) < nullCheck(latestRFM.versionNumber)
        ? latestRFM
        : null;
    emit(
      new IsOnDeviceFirmwareUpdatesScreen(
        device,
        espUpdate,
        rfmUpdate,
        currentRunningUpdate.length > 0 ? currentRunningUpdate[0] : null,
      ),
    );
  }
}

/** frontend/lib/bloc/devices/events/go_to_update_device_firmware_screen.dart: at once. */
export class GoToUpdateDeviceFirmwareScreen implements DevicesEvent {
  constructor(
    readonly device: Device,
    readonly firmware: Firmware,
    readonly resumeUpdateId: number | null = null,
  ) {}

  async handleEvent(_bloc: DevicesBloc, emit: Emitter<DevicesState>) {
    emit(
      new IsUpdatingDeviceFirmwareState(
        this.device,
        this.firmware,
        this.resumeUpdateId,
      ),
    );
  }
}
