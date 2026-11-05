// Port of the Add Hub page's own bloc (frontend/lib/screens/devices/add_device/bloc/*): its
// states, its events and AddDeviceBloc, which holds the page's two text controllers.
//
// How Flutter runs it, kept here:
// - One handler takes every event and does not wait for it (`event.handle(...)` is not awaited),
//   so events run side by side and an event may emit long after it started (the "Change Mac
//   Address" popup's Okay, Submit's re-sends). Release builds accept those late emits, and they
//   take effect here too (a debug build of Flutter asserts on them instead).
// - Each event but Submit is remembered as `lastRanEvent`. Submit sets isLoading and sends that
//   event again, so the page redraws with the loader; on a failure it clears isLoading and sends
//   it once more. That re-sends whatever ran last: when it was the "Change Mac Address" event,
//   its popup opens again (and the button does not turn into the loader); when it was the scan,
//   the scanner opens again.
// - A state equal to the current one is not emitted (Equatable; the first emit always is).
//   AddDeviceShowingMacAddressFieldState compares isLoading, canSubmit, macAddressEditable and
//   validMacAddress (not validName).
// - `err`, the failure popup's message, is static: it outlives the page and carries over to the
//   next failure that brings no message of its own.
// - validName and validMacAddress are never changed from false; every emit passes
//   validMacAddress: true. Neither state's canSubmit is read by the page.
// Not ported: AddDeviceLoadingState and AddDeviceWarnAboutEditingState, which nothing emits.

import { popPopup, showPopupMessage } from '../../../components/popups/popups';
import { showToastPopup } from '../../../components/popups/toasts';
import { scanQrCode } from '../../../components/forms/QrScanner';
import { FontAwesomeIcons } from '../../../components/icons/iconData';
import type { Profile } from '../../../models/profile';
import { hashMacAddress } from '../../../services/hashMacAddress';
import { reportError } from '../../../services/reportError';
import {
  addDevice,
  setDevice,
} from '../../../services/requests/deviceRequests';
import { setProfile } from '../../../services/requests/userRequests';
import {
  type DevicesBloc,
  GoToAddHubSuccessScreen,
} from '../../../state/devices/devicesBloc';
import { kCartellDarkGray } from '../../../theme/colors';
import { ValueNotifier } from '../../../utilities/valueNotifier';

// --- states ------------------------------------------------------------------------------

export abstract class BaseAddDeviceState {
  constructor(readonly isLoading: boolean, readonly canSubmit: boolean) {}

  get props(): unknown[] {
    return [this.isLoading, this.canSubmit];
  }
}

export class AddDeviceInitialState extends BaseAddDeviceState {}

export class AddDeviceShowingMacAddressFieldState extends BaseAddDeviceState {
  readonly validName: boolean;
  readonly validMacAddress: boolean;
  readonly macAddressEditable: boolean;

  constructor({
    validName,
    validMacAddress,
    macAddressEditable,
    isLoading,
    canSubmit,
  }: {
    validName: boolean;
    validMacAddress: boolean;
    macAddressEditable: boolean;
    isLoading: boolean;
    canSubmit: boolean;
  }) {
    super(isLoading, canSubmit);
    this.validName = validName;
    this.validMacAddress = validMacAddress;
    this.macAddressEditable = macAddressEditable;
  }

  get props(): unknown[] {
    return [...super.props, this.macAddressEditable, this.validMacAddress];
  }
}

function statesEqual(a: BaseAddDeviceState, b: BaseAddDeviceState): boolean {
  const left = a.props;
  const right = b.props;
  return (
    a.constructor === b.constructor &&
    left.length === right.length &&
    left.every((value, i) => Object.is(value, right[i]))
  );
}

// --- the page the bloc talks to (Flutter's BuildContext) -----------------------------------

export type AddDevicePage = {
  /** context.mounted: the page is still up. */
  readonly mounted: boolean;
  /** context.read<DevicesBloc>(). */
  readDevicesBloc: () => DevicesBloc;
};

// --- bloc --------------------------------------------------------------------------------

/** AddDeviceBloc.err (static). */
let err: string | null = null;

/** Tests only: the static error message, as a fresh app has it. */
export function resetAddDeviceErrForTests(): void {
  err = null;
}

export type AddDeviceEmitter = (state: BaseAddDeviceState) => void;

export interface BaseAddDeviceEvent {
  handle(
    bloc: AddDeviceBloc,
    currentState: BaseAddDeviceState,
    emit: AddDeviceEmitter,
  ): Promise<void>;
}

export class AddDeviceBloc {
  locationID: number | undefined;
  profile: Profile | undefined;
  validName = false;
  validMacAddress = false;
  isLoading = false;
  lastRanEvent: BaseAddDeviceEvent = new AddDeviceInitEvent();

  /** The Hub Name and Mac Address fields' controllers. */
  readonly name = new ValueNotifier('');
  readonly macAdd = new ValueNotifier('');

  private current: BaseAddDeviceState = new AddDeviceInitialState(false, false);
  private emitted = false;
  private closed = false;
  private readonly listeners = new Set<() => void>();

  constructor(readonly page: AddDevicePage) {
    // flutter_bloc handles an added event asynchronously; the first frame shows the initial state.
    queueMicrotask(() => this.add(new AddDeviceInitEvent()));
  }

  get hubName(): string {
    return this.name.value;
  }

  get state(): BaseAddDeviceState {
    return this.current;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getState = () => this.current;

  add(event: BaseAddDeviceEvent): void {
    if (this.closed) {
      return;
    }
    if (!(event instanceof AddDeviceSubmitEvent)) {
      this.lastRanEvent = event;
    }
    event.handle(this, this.current, this.emit).catch(reportError);
  }

  private readonly emit: AddDeviceEmitter = state => {
    if (this.closed) {
      return;
    }
    if (this.emitted && statesEqual(state, this.current)) {
      return;
    }
    this.emitted = true;
    this.current = state;
    this.listeners.forEach(listener => listener());
  };

  /** BlocProvider closes it when the page goes. */
  close(): void {
    this.closed = true;
  }
}

/** showAlertDialogFailure. */
export function showAlertDialogFailure(): void {
  showPopupMessage({
    title: 'Adding Hub Failed',
    message: err ?? 'An Error occurred. Please try again.',
  });
}

/** showAlertDialogInvalidMacAddress. */
export function showAlertDialogInvalidMacAddress(): void {
  showPopupMessage({
    title: 'Failed to validate hub',
    message:
      err ??
      "This hub couldn't be validated. Please try again and contact support if the issue persists.",
  });
}

// Not ported: showAlertDialogScanningError, which nothing calls.

// --- events ------------------------------------------------------------------------------

/**
 * Runs as the page opens: fetches the profile and keeps its first location's id, where the hub
 * will be registered. A profile with no location fails on [0] after the catch (a RangeError in
 * Flutter, which `on Exception` does not catch), so the id stays unset and Submit sends "null".
 */
export class AddDeviceInitEvent implements BaseAddDeviceEvent {
  async handle(bloc: AddDeviceBloc) {
    try {
      bloc.profile = await setProfile();
    } catch (error) {
      reportError(error);
      if (!bloc.page.mounted) {
        return;
      }
      // PORT-GAP: Navigator.of(bloc.context).pop() (it pops the page under the app's screens).
      bloc.add(
        new AddDeviceErrorEvent(
          'An error occurred while adding a hub. If this continues to happen contact support.',
          '15b12a',
        ),
      );
      return;
    }
    bloc.locationID = bloc.profile.locations[0].id;
  }
}

export class AddDeviceErrorEvent implements BaseAddDeviceEvent {
  constructor(readonly message: string, readonly code: string) {}

  async handle() {
    // PORT-GAP: Navigator.push of FailureWidget(message, code): the Wi-Fi pairing failure page
    // (connect_hub_to_wifi/failure_widget.dart), with "Return to Devices", "Begin Pairing Again"
    // and "Error: <code>".
  }
}

/** Unused in Flutter as well: nothing sends it. */
export class AddDeviceHideMacAddressEvent implements BaseAddDeviceEvent {
  async handle(
    bloc: AddDeviceBloc,
    _state: BaseAddDeviceState,
    emit: AddDeviceEmitter,
  ) {
    emit(new AddDeviceInitialState(bloc.isLoading, false));
  }
}

/** A MAC from the scanner: it fills the MAC field, which is then shown and not editable. */
export class AddDeviceScannedMacAddressEvent implements BaseAddDeviceEvent {
  constructor(readonly macAddress: string, readonly successful: boolean) {}

  async handle(
    bloc: AddDeviceBloc,
    _state: BaseAddDeviceState,
    emit: AddDeviceEmitter,
  ) {
    // Flutter has validateProducedDevice(mac) here, commented out ("when the django side is
    // updated").
    bloc.macAdd.value = this.macAddress;
    emit(
      new AddDeviceShowingMacAddressFieldState({
        validName: bloc.validName,
        validMacAddress: true,
        macAddressEditable: false,
        isLoading: bloc.isLoading,
        canSubmit: bloc.validName,
      }),
    );
  }
}

/** "Tap to Add Mac Address Manually". */
export class AddDeviceShowMacAddressEvent implements BaseAddDeviceEvent {
  constructor(readonly isEditable: boolean) {}

  async handle(
    bloc: AddDeviceBloc,
    _state: BaseAddDeviceState,
    emit: AddDeviceEmitter,
  ) {
    emit(
      new AddDeviceShowingMacAddressFieldState({
        validName: bloc.validName,
        validMacAddress: true,
        macAddressEditable: this.isEditable,
        isLoading: bloc.isLoading,
        canSubmit: false,
      }),
    );
  }
}

const MAC_ADDRESS = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
// The scanner's validator (Flutter's [:\-] is the same class as [:-]).
const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

/** The yellow "Tap To Scan QR Code" tile: opens the scanner, which accepts only a MAC address. */
export class AddDeviceStartScanningEvent implements BaseAddDeviceEvent {
  async handle(bloc: AddDeviceBloc) {
    scanQrCode({
      title: 'Scan Hub QR Code',
      loadingPrompt: 'Please scan the QR code on the hub',
      invalidScanPrompt: 'That does not seem to match a QR code on a hub',
      returnPrompt: 'Tap to use hub QR code',
      isBarcodeValid: barcode => MAC_ADDRESS_PATTERN.test(barcode),
      returnBarcode: value => {
        if (!bloc.page.mounted) {
          throw new Error('Could not load scanner');
        }
        if (MAC_ADDRESS.test(value)) {
          bloc.add(new AddDeviceScannedMacAddressEvent(value, true));
        } else {
          if (value === '-1') {
            return;
          }
          bloc.add(new AddDeviceScannedMacAddressEvent('', false));
          showAlertDialogInvalidMacAddress();
        }
      },
    });
  }
}

/** Tapping the MAC field while it is not editable (it was scanned). */
export class AddDeviceWarnAboutEditingEvent implements BaseAddDeviceEvent {
  async handle(
    bloc: AddDeviceBloc,
    _state: BaseAddDeviceState,
    emit: AddDeviceEmitter,
  ) {
    showPopupMessage({
      title: 'Change Mac Address',
      message:
        "The Mac Address of your hub has already been scanned. Are you sure you'd like to change it?",
      onOkay: () => {
        popPopup();
        emit(
          new AddDeviceShowingMacAddressFieldState({
            validName: bloc.validName,
            validMacAddress: true,
            macAddressEditable: true,
            isLoading: bloc.isLoading,
            canSubmit: bloc.validName && bloc.validMacAddress,
          }),
        );
      },
    });
  }
}

/** Kept out of literals: the space before each line break is part of Flutter's message. */
const ERROR_LINE_BREAK = ' \n';

/** Dart's `data['non_field_errors']` on whatever the body decoded to: only a Map can be indexed. */
function nonFieldErrors(data: unknown): unknown {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError(
      `${
        data === null ? 'Null' : typeof data
      } is not a Map (data['non_field_errors'])`,
    );
  }
  return (data as Record<string, unknown>).non_field_errors;
}

/**
 * Submit: shows the loader, hashes the lowercased MAC, and registers the hub on the profile's
 * first location. Below 300: fetches the new hub and goes to "Hub Added to Account!". 300–499:
 * the body's non_field_errors become the popup's message, each on its own line. 500 and up: the
 * "Failed to add hub…" message. Either failure shows "Adding Hub Failed". A body that is not JSON,
 * or not an object on a 300–499, fails before the loader is cleared, so the loader stays (an
 * uncaught error in Flutter); so does a failed fetch of the new hub.
 */
export class AddDeviceSubmitEvent implements BaseAddDeviceEvent {
  constructor(readonly macAddress: string) {}

  async handle(bloc: AddDeviceBloc) {
    const macAddress = this.macAddress;
    const hubName = bloc.hubName;
    bloc.isLoading = true;
    bloc.add(bloc.lastRanEvent);

    if (macAddress.length === 0 || hubName.length === 0) {
      showToastPopup(
        'Make sure you enter a Name and valid Mac Address before submitting',
        kCartellDarkGray,
        FontAwesomeIcons.circleXmark,
        true,
      );
      return;
    }
    const hashedMacAddress = hashMacAddress(macAddress.toLowerCase());
    const res = await addDevice({
      body: { name: hubName, mac_address: hashedMacAddress },
      locationID: bloc.locationID,
    });

    if (res.statusCode < 300) {
      const decodedDevice = JSON.parse(res.body) as { id: number };
      const device = await setDevice(decodedDevice.id);
      if (!bloc.page.mounted) {
        return;
      }
      bloc.page.readDevicesBloc().add(new GoToAddHubSuccessScreen(device));
    } else if (res.statusCode >= 300 && res.statusCode < 500) {
      const errors = nonFieldErrors(JSON.parse(res.body));
      let message = '';
      if (errors !== null && errors !== undefined) {
        const list = errors as ArrayLike<unknown>;
        for (let i = 0; i < list.length; i++) {
          message = message + ERROR_LINE_BREAK + String(list[i]);
        }
        err = message;
      }
      bloc.isLoading = false;
      bloc.add(bloc.lastRanEvent);
      if (!bloc.page.mounted) {
        return;
      }
      showAlertDialogFailure();
    } else {
      err =
        'Failed to add hub. Please try again. If the problem persists, please contact support.';
      bloc.isLoading = false;
      bloc.add(bloc.lastRanEvent);
      if (!bloc.page.mounted) {
        return;
      }
      showAlertDialogFailure();
    }
  }
}
