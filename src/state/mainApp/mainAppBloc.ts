// Port of the MainAppBloc (frontend/lib/bloc/main_app/*; spec 06 §4): the state machine of the
// signed-in shell. Made on a successful log in or auto sign-in, before the hub list is fetched,
// so by the time the shell appears it is already on the Hubs state.
//
// Built so far: the loading and Hubs states, GoToHubsScreenEvent and the error recovery; Account
// Settings and its three edit forms (name, password, phone number).
// PORT-GAP: GoBackNStatesEvent and showMessage (forwarding to the AuthBloc's message stream),
// with the first screen that uses them.
// PORT-GAP: IsOnEventHistoryScreenState(event, refresh) + GoToEventHistoryScreen.
// PORT-GAP: IsOnContactUsScreenState + GoToContactUsScreen.
// PORT-GAP: IsOnAlexaHelpScreenState(isConnected) + GoToAlexaHelpScreenState.
// PORT-GAP: IsOnHubLightsHelpScreenState + GoToHubLightsHelpScreenEvent.

import type { Profile } from '../../models/profile';
import type { User } from '../../models/user';
import { AuthRequestManager } from '../../services/requests/authRequests';
import { setProfile, setUser } from '../../services/requests/userRequests';
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

/**
 * Account Settings. User and profile are null until both requests land: neither has a meaningful
 * empty value, so the screen is a skeleton until then.
 */
export class IsOnAccountSettingsScreenState extends MainAppState {
  constructor(
    readonly user: User | null = null,
    readonly profile: Profile | null = null,
  ) {
    super();
  }

  get props() {
    return [...super.props, this.user, this.profile];
  }
}

/** The three edit forms. Not poppable. */
export class IsOnAccountSettingsEditNameScreenState extends MainAppState {
  constructor(readonly user: User) {
    super(false);
  }
}

export class IsOnAccountSettingsEditPasswordScreenState extends MainAppState {
  constructor(readonly user: User) {
    super(false);
  }
}

export class IsOnAccountSettingsEditPhoneNumberScreenState extends MainAppState {
  constructor(readonly user: User) {
    super(false);
  }
}

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

/**
 * From the side menu (or back from an edit form): the skeleton at once, then the user and the
 * profile, fetched side by side. Like Dart's record `.wait`, both requests finish before a failure
 * is raised (to the error recovery: Hubs, or sign-in again). Leaving meanwhile (the skeleton has
 * the side menu) is respected: nothing jumps back.
 */
export class GoToAccountSettingsScreen implements MainAppEvent {
  async handleEvent(bloc: MainAppBloc, emit: Emitter<MainAppState>) {
    const pending = new IsOnAccountSettingsScreenState();
    emit(pending);

    const [user, profile] = await Promise.allSettled([setUser(), setProfile()]);
    if (user.status === 'rejected') {
      throw user.reason;
    }
    if (profile.status === 'rejected') {
      throw profile.reason;
    }

    if (emit.isDone || bloc.state !== pending) {
      return;
    }
    emit(new IsOnAccountSettingsScreenState(user.value, profile.value));
  }
}

/**
 * The edit forms render from the user already in hand and do not fetch it again: a refresh
 * landing mid-edit would overwrite what was typed.
 */
export class GoToAccountSettingsEditNameScreenEvent implements MainAppEvent {
  constructor(readonly user: User) {}

  async handleEvent(_bloc: MainAppBloc, emit: Emitter<MainAppState>) {
    emit(new IsOnAccountSettingsEditNameScreenState(this.user));
  }
}

export class GoToAccountSettingsEditPasswordScreenEvent
  implements MainAppEvent
{
  constructor(readonly user: User) {}

  async handleEvent(_bloc: MainAppBloc, emit: Emitter<MainAppState>) {
    emit(new IsOnAccountSettingsEditPasswordScreenState(this.user));
  }
}

export class GoToAccountSettingsEditPhoneNumberScreenEvent
  implements MainAppEvent
{
  constructor(readonly user: User) {}

  async handleEvent(_bloc: MainAppBloc, emit: Emitter<MainAppState>) {
    emit(new IsOnAccountSettingsEditPhoneNumberScreenState(this.user));
  }
}
