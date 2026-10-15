// Port of the MainAppBloc (frontend/lib/bloc/main_app/*; spec 06 §4): the state machine of the
// signed-in shell. Made on a successful log in or auto sign-in, before the hub list is fetched,
// so by the time the shell appears it is already on the Hubs state.
//
// Built so far: the loading and Hubs states, GoToHubsScreenEvent and the error recovery.
// LATER(part 6): GoBackNStatesEvent and showMessage (forwarding to the AuthBloc's message stream),
// with the first screen that uses them.
// LATER(part 21): IsOnAccountSettingsScreenState(user?, profile?) + GoToAccountSettingsScreen, and
// the three edit states and events (name, password, phone number; part 22).
// LATER(part 35): IsOnEventHistoryScreenState(event, refresh) + GoToEventHistoryScreen.
// LATER(part 20): IsOnContactUsScreenState + GoToContactUsScreen.
// LATER(part 18): IsOnAlexaHelpScreenState(isConnected) + GoToAlexaHelpScreenState.
// LATER(part 17): IsOnHubLightsHelpScreenState + GoToHubLightsHelpScreenEvent.

import { AuthRequestManager } from '../../services/requests/authRequests';
import type { AuthBloc } from '../auth/authBloc';
import { AutoLoginEvent } from '../auth/authBloc';
import { DevicesBloc, GoToDevicesHomeScreen } from '../devices/devicesBloc';
import {
  Emitter,
  GenericBloc,
  GenericEvent,
  GenericState,
  stateTimestamp,
} from '../genericBloc';

// --- states ------------------------------------------------------------------------------

/** Every state carries a timestamp in its props, so every emit is distinct. */
export abstract class MainAppState extends GenericState {
  readonly timestamp = stateTimestamp();

  get props() {
    return [...super.props, this.timestamp];
  }
}

/** The loading screen. Not poppable. */
export class IsLoadingMainAppState extends MainAppState {
  constructor() {
    super(false);
  }
}

/** The hubs area (its own DevicesBloc decides the screen). */
export class IsOnHubsScreenState extends MainAppState {}

// --- bloc --------------------------------------------------------------------------------

export class MainAppBloc extends GenericBloc<MainAppState> {
  /** The DevicesBloc made for the last Hubs state shown (MainAppRouter sets it). */
  bloc: DevicesBloc | null = null;

  constructor(readonly parentBloc: AuthBloc) {
    super(new IsLoadingMainAppState(), new IsOnHubsScreenState());
    this.add(new GoToHubsScreenEvent());
  }

  protected onErrorDuringEventHandle(error: unknown): void {
    super.onErrorDuringEventHandle(error);
    this.recover();
  }

  private async recover(): Promise<void> {
    const result = await new AuthRequestManager().auth({
      shouldForceAuth: true,
    });
    if (result.failed) {
      this.parentBloc.add(new AutoLoginEvent());
    }
    this.add(new GoToHubsScreenEvent());
  }
}

export type MainAppEvent = GenericEvent<MainAppState, MainAppBloc>;

// --- events ------------------------------------------------------------------------------

/**
 * Already in the hubs area (e.g. the side menu's HUBs entry tapped inside a hub): re-emitting
 * would make a DevicesBloc nobody shows, so the live one is sent back to its list instead. A
 * closed one means the shell has not replaced it yet; that path emits.
 */
export class GoToHubsScreenEvent implements MainAppEvent {
  async handleEvent(bloc: MainAppBloc, emit: Emitter<MainAppState>) {
    const devices = bloc.bloc;
    if (
      bloc.state instanceof IsOnHubsScreenState &&
      devices !== null &&
      !devices.isClosed
    ) {
      devices.add(new GoToDevicesHomeScreen());
      return;
    }
    // Hands off to the DevicesBloc, which fetches for itself.
    emit(new IsOnHubsScreenState());
  }
}
