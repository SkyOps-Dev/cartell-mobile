// Port of the AuthBloc (frontend/lib/bloc/auth/*; spec 06 §3, spec 08 §5–§6): the root state
// machine for the signed-out screens. The screen shown is a function of its state.
//
// Built so far: Loading + auto-login with the biometric gate, the Lock screen, Welcome, Log in
// (with the biometric offer), Registration, Maintenance, Log out, and the hand-over to the
// signed-in shell (MainAppBloc).
// What is still missing is marked LATER(part N) where it goes; `npm run later` lists it.

import type { IconData } from '../../components/icons/iconData';
import { Icons } from '../../components/icons/iconData';
import type { RenderedMessage } from '../../components/popups/messages';
import {
  autoLoginMethodOnTheLoadScreen,
  successfulLoginStartup,
} from '../../services/authManager/checkCreds';
import { finishAutofillContext } from '../../services/autofill';
import {
  BiometricOutcome,
  BiometricService,
} from '../../services/biometricService';
import { FailedToAutologinException } from '../../services/exceptions';
import { AuthRequestManager } from '../../services/requests/authRequests';
import {
  fetchDevices,
  RawDevice,
} from '../../services/requests/deviceRequests';
import { setUser } from '../../services/requests/userRequests';
import type { Result } from '../../services/result';
import { SecureStorage } from '../../services/secureStorage';
import {
  Emitter,
  GenericBloc,
  GenericEvent,
  GenericState,
} from '../genericBloc';
import { MainAppBloc } from '../mainApp/mainAppBloc';

// --- states ------------------------------------------------------------------------------

export abstract class AuthState extends GenericState {}

/** The Loading screen while auto-login runs. Not poppable. */
export class IsLoadingAppState extends AuthState {
  constructor() {
    super(false);
  }
}

export class IsOnWelcomeScreenState extends AuthState {}

/**
 * The session is valid but the user has not passed the biometric gate they opted into. Not
 * poppable: that is the whole point of the gate. The way out is a successful unlock or a password,
 * never Back.
 */
export class IsLockedState extends AuthState {
  /**
   * Set only when the OS told us something the user needs to know (a lockout after too many
   * attempts). Null on an ordinary cancel, where explaining what just happened would be noise.
   */
  constructor(readonly message: string | null = null) {
    super(false);
  }

  get props() {
    return [...super.props, this.message];
  }
}

export class IsOnLoginScreenState extends AuthState {
  readonly temporaryEmail: string | null;
  readonly emailError: boolean;
  readonly passwordError: boolean;
  /** True while a login attempt is in flight: the screen stays mounted with its spinner. */
  readonly isSubmitting: boolean;

  constructor({
    temporaryEmail = null,
    emailError = false,
    passwordError = false,
    isSubmitting = false,
  }: {
    temporaryEmail?: string | null;
    emailError?: boolean;
    passwordError?: boolean;
    isSubmitting?: boolean;
  } = {}) {
    super(!isSubmitting);
    this.temporaryEmail = temporaryEmail;
    this.emailError = emailError;
    this.passwordError = passwordError;
    this.isSubmitting = isSubmitting;
  }

  get props() {
    return [
      ...super.props,
      this.temporaryEmail,
      this.emailError,
      this.passwordError,
      this.isSubmitting,
    ];
  }
}

export class IsOnRegistrationScreenState extends AuthState {
  readonly email: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly phoneNumber: string | null;
  readonly isSubmitting: boolean;

  constructor({
    email = null,
    firstName = null,
    lastName = null,
    phoneNumber = null,
    isSubmitting = false,
  }: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    isSubmitting?: boolean;
  } = {}) {
    super(!isSubmitting);
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phoneNumber = phoneNumber;
    this.isSubmitting = isSubmitting;
  }

  get props() {
    return [
      ...super.props,
      this.email,
      this.firstName,
      this.lastName,
      this.phoneNumber,
      this.isSubmitting,
    ];
  }
}

/** Declared in Flutter's state.dart but never emitted, so AuthBlocWidget has no screen for it. */
export class IsShowingPopUpMessage extends AuthState {
  constructor(readonly title: string, readonly message: string) {
    super();
  }

  get props() {
    return [...super.props, this.title, this.message];
  }
}

/** The maintenance / "can't reach Cartell" takeover. */
export class IsInMaintenanceMode extends AuthState {
  /** True when no server answered at all, rather than one answering "not available". */
  constructor(readonly isUnreachable = false) {
    super();
  }

  get props() {
    return [...super.props, this.isUnreachable];
  }
}

/** Signed in: the shell, driven by its own MainAppBloc, with the hubs fetched at sign-in. */
export class IsOnDevicesScreenState extends AuthState {
  constructor(
    readonly email: string | null,
    readonly password: string | null,
    readonly bloc: MainAppBloc,
    readonly devices: RawDevice[],
  ) {
    super();
  }

  // `bloc` is left out on purpose: comparing MainAppBloc instances by identity would make
  // otherwise-equal states differ.
  get props() {
    return [...super.props, this.email, this.password, this.devices];
  }
}

// --- bloc --------------------------------------------------------------------------------

export class AuthBloc extends GenericBloc<AuthState> {
  manager = new AuthRequestManager();
  /** The signed-in shell's state machine, made on each successful sign-in. */
  subBloc: MainAppBloc | null = null;
  private messageListeners = new Set<(message: RenderedMessage) => void>();

  constructor() {
    super(new IsLoadingAppState(), new IsOnWelcomeScreenState());
    this.add(new AutoLoginEvent());
  }

  /** popupStreamController.add */
  showMessage(message: RenderedMessage): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  /** messageStream.listen */
  onMessage(listener: (message: RenderedMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }
}

export type AuthEvent = GenericEvent<AuthState, AuthBloc>;

// --- events ------------------------------------------------------------------------------

/**
 * Runs on every launch (the bloc's constructor adds it), and again on Unlock, on the server's
 * return from maintenance, and when a screen finds the session dead.
 */
export class AutoLoginEvent implements AuthEvent {
  async handleEvent(bloc: AuthBloc, emit: Emitter<AuthState>) {
    emit(new IsLoadingAppState());
    // LATER(part 2): the auth logger's lines, timed by a stopwatch from here ("Got access token
    // after …", "Found null authtoken after …", "Starting auto login...", "Auto login
    // succeeded/failed after …ms", "Exception during load screen auth: …").
    try {
      // Housekeeping with its own guard: above the token check so it reaches signed-out
      // installs too, outside the retry loop so it runs once, and never able to decide whether
      // a session survives (a failure here is only logged).
      try {
        await SecureStorage.purgeLegacyCredentials();
      } catch {
        // LATER(part 2): authLogger.w("Could not purge legacy credentials: $e").
      }

      const authToken = await SecureStorage.getAccessToken();
      if (authToken === null || authToken.length === 0) {
        emit(new IsOnWelcomeScreenState());
        return;
      }

      // The biometric gate. It sits after the token check because there is nothing to protect
      // without a session, and before the network work because making someone wait on three
      // auth attempts and then asking for a fingerprint is the wrong order.
      if ((await SecureStorage.getBiometricsEnabled()) === true) {
        const outcome = await new BiometricService().authenticate({
          reason: 'Unlock Cartell',
        });
        switch (outcome) {
          case BiometricOutcome.success:
            break;
          case BiometricOutcome.unavailable:
            // They opted in and then removed the enrolment at the OS level. Holding them at a
            // prompt the device can no longer show would be a lockout of our own making, so forget
            // the preference and carry on as a normal auto-login.
            // LATER(part 2): authLogger.w("Biometrics no longer available; clearing the preference").
            await SecureStorage.setBiometricsEnabled(false);
            break;
          case BiometricOutcome.lockedOut:
            emit(
              new IsLockedState(
                'Too many attempts. Use your password to sign in instead.',
              ),
            );
            return;
          case BiometricOutcome.failed:
            emit(new IsLockedState());
            return;
        }
      }

      let result: Result | null = null;
      for (let i = 0; i < 3; i++) {
        result = await autoLoginMethodOnTheLoadScreen();
        if (result.succeeded) {
          break;
        }
      }

      if (result !== null && result.failed) {
        emit(new IsOnWelcomeScreenState());
      } else if (result !== null && result.succeeded) {
        bloc.subBloc = new MainAppBloc(bloc);
        const devices = await fetchDevices();
        emit(new IsOnDevicesScreenState(null, null, bloc.subBloc, devices));
      } else {
        throw new FailedToAutologinException('Failed to autologin');
      }
    } catch {
      emit(new IsOnWelcomeScreenState());
    }
  }
}

export class MaintenanceModeEvent implements AuthEvent {
  constructor(readonly isUnreachable = false) {}

  async handleEvent(_bloc: AuthBloc, emit: Emitter<AuthState>) {
    emit(new IsInMaintenanceMode(this.isUnreachable));
  }
}

export class GoToWelcomeScreenEvent implements AuthEvent {
  async handleEvent(_bloc: AuthBloc, emit: Emitter<AuthState>) {
    emit(new IsOnWelcomeScreenState());
  }
}

export class GoToLoginScreenEvent implements AuthEvent {
  constructor(readonly emailError = false, readonly passwordError = false) {}

  async handleEvent(_bloc: AuthBloc, emit: Emitter<AuthState>) {
    emit(
      new IsOnLoginScreenState({
        emailError: this.emailError,
        passwordError: this.passwordError,
      }),
    );
  }
}

export class GoToRegistrationScreenEvent implements AuthEvent {
  async handleEvent(_bloc: AuthBloc, emit: Emitter<AuthState>) {
    emit(new IsOnRegistrationScreenState());
  }
}

const loginErrorMessage = {
  kind: 'PopupError',
  title: 'An Error Occured',
  message:
    'An error occured. Please try again. If problem persists, contact support',
} as const;

/**
 * Offers biometric unlock once, after a successful password login, on a device that can do it.
 * The preference is written to false *before* the dialog appears, which is what records "asked":
 * PopupDialog has no decline callback (Cancel simply closes it), so without this the offer would
 * return on every login until the user gave in.
 */
async function offerBiometricUnlock(bloc: AuthBloc): Promise<void> {
  try {
    await offerBiometricUnlockUnguarded(bloc);
  } catch {
    // By this point the tokens are stored and the user is authenticated. Anything escaping here
    // would surface as the login error popup and bounce them back to a login that worked. An
    // offer is not worth that.
    // LATER(part 2): authLogger.w("Could not offer biometric unlock: $e").
  }
}

async function offerBiometricUnlockUnguarded(bloc: AuthBloc): Promise<void> {
  if ((await SecureStorage.getBiometricsEnabled()) !== null) {
    return;
  }
  if (!(await new BiometricService().isAvailable())) {
    return;
  }
  await SecureStorage.setBiometricsEnabled(false);
  bloc.showMessage({
    kind: 'PopupDialog',
    title: 'Unlock with biometrics?',
    message:
      'Use your fingerprint or face to open Cartell instead of typing your password. You can change this later in Account Settings.',
    onOkay: () => {
      SecureStorage.setBiometricsEnabled(true);
    },
  });
}

export class AttemptLoggingInEvent implements AuthEvent {
  constructor(readonly email: string, readonly password: string) {}

  async handleEvent(bloc: AuthBloc, emit: Emitter<AuthState>) {
    const { email, password } = this;
    if (email.length === 0 || password.length === 0) {
      emit(
        new IsOnLoginScreenState({
          temporaryEmail: email,
          emailError: email.length === 0,
          passwordError: password.length === 0,
        }),
      );
      return;
    }
    // The login screen stays mounted, with its own spinner, for the whole attempt.
    emit(
      new IsOnLoginScreenState({ temporaryEmail: email, isSubmitting: true }),
    );
    try {
      const data = await bloc.manager.login({ email, password });
      if (data === null) {
        // Flutter dereferences the null response, which its catch-all turns into the popup below.
        throw new Error('No response');
      }
      if (data.statusCode === 401) {
        emit(new IsOnLoginScreenState({ temporaryEmail: email }));
        bloc.showMessage({
          kind: 'PopupError',
          title: 'Account Not Found',
          message: 'Please check your credentials and try again.',
        });
        return;
      }
      if (data.statusCode >= 300) {
        emit(new IsOnLoginScreenState({ temporaryEmail: email }));
        bloc.showMessage(loginErrorMessage);
        return;
      }
      // Credentials are confirmed good, and the fields are still mounted. The only commit of the
      // autofill context: what makes the platform offer to save the password. Every failure path
      // leaves it open, and the screen's AutofillGroup cancels it (PARITY_ISSUES P5).
      finishAutofillContext({ shouldSave: true });
      await successfulLoginStartup(data);
      // LATER(part 14): NotificationApi.init() (not awaited), then await getFCMToken().
      await setUser();
      await offerBiometricUnlock(bloc);
      bloc.subBloc = new MainAppBloc(bloc);
      const devices = await fetchDevices();
      emit(new IsOnDevicesScreenState(email, password, bloc.subBloc, devices));
    } catch {
      bloc.showMessage(loginErrorMessage);
      emit(new IsOnLoginScreenState({ temporaryEmail: email }));
    }
  }
}

export class AttemptRegistrationEvent implements AuthEvent {
  constructor(
    readonly fields: {
      email: string;
      password: string;
      passwordConfirmed: string;
      firstName: string;
      lastName: string;
      phoneNo: string;
    },
  ) {}

  async handleEvent(bloc: AuthBloc, emit: Emitter<AuthState>) {
    const { email, password, passwordConfirmed, firstName, lastName, phoneNo } =
      this.fields;
    const form = (isSubmitting = false) =>
      new IsOnRegistrationScreenState({
        email,
        firstName,
        lastName,
        phoneNumber: phoneNo,
        isSubmitting,
      });

    emit(form(true));
    try {
      if (password !== passwordConfirmed) {
        bloc.showMessage({
          kind: 'PopupError',
          message:
            'Passwords do not match. Please re-enter them and try again.',
          title: 'Unable to Create Account',
        });
        emit(form());
        return;
      }
      const data = await new AuthRequestManager().register({
        email,
        firstName,
        lastName,
        password,
        phoneNo,
      });
      if (data === null) {
        // Q4: Flutter dereferences the null with an Error its `on Exception` clause does not
        // catch, so the spinner stays until the maintenance/unreachable screen takes over.
        return;
      }
      if (data.statusCode === 201) {
        // The account now exists with this password, so the credential is real: commit while the
        // fields are still mounted (PARITY_ISSUES P5).
        finishAutofillContext({ shouldSave: true });
        // Q3: title and message are swapped as built.
        bloc.showMessage({
          kind: 'PopupNotification',
          message: 'Registration Succeeded',
          title: 'Your account was created. Please login',
          icon: Icons.check_circle as IconData,
        });
        emit(new IsOnLoginScreenState({ temporaryEmail: email }));
      } else if (data.statusCode >= 300 && data.statusCode < 500) {
        let res: unknown;
        try {
          res = JSON.parse(data.body);
        } catch {
          // jsonDecode throws a FormatException, an Exception: handled as below.
          throw new FormatError();
        }
        const message = buildErrorMessage(res);
        bloc.showMessage({
          kind: 'PopupError',
          message,
          title: 'Unable to Create Account',
        });
        emit(form());
      } else {
        bloc.showMessage({
          kind: 'PopupError',
          message:
            'Something went wrong on our end. Please try again in a moment.',
          title: 'Unable to Create Account',
        });
        emit(form());
      }
    } catch (error) {
      if (!(error instanceof FormatError)) {
        // Dart Errors (not Exceptions) escape the `on Exception` clause; the spinner stays.
        throw error;
      }
      // Q3: title and message are swapped as built.
      bloc.showMessage({
        kind: 'PopupError',
        message: 'An Error Occured',
        title:
          'Request timed out. Check your internet connection, and then try again.',
      });
      emit(form());
    }
  }
}

/** Stands in for Dart's FormatException from jsonDecode (an Exception, so it is caught). */
class FormatError extends Error {}

/**
 * The first present key of email, password, first_name, last_name, phone_no; each item appended
 * as "\n " + item. Ported as written, so a string value is iterated character by character.
 */
export function buildErrorMessage(res: unknown): string {
  const json = (res ?? {}) as Record<string, unknown>;
  for (const field of [
    'email',
    'password',
    'first_name',
    'last_name',
    'phone_no',
  ]) {
    const value = json[field];
    if (value !== null && value !== undefined) {
      const items = value as ArrayLike<unknown>;
      let message = '';
      for (let i = 0; i < items.length; i++) {
        message = `${message}\n ${String(items[i])}`;
      }
      return message;
    }
  }
  return 'An error occurred. Please try again.';
}

/**
 * Log Out (attempt_log_out_event.dart): the side menu's entry (part 6), and until then the
 * placeholder signed-in screen's button. It asks first. On Okay the dialog closes at once and the
 * log-out runs behind it (drawMessage does not wait for onOkay), then adds this event again with
 * shouldLogOut: true, which goes to Welcome.
 */
export class AttemptLogOutEvent implements AuthEvent {
  constructor(readonly shouldLogOut = false) {}

  async handleEvent(bloc: AuthBloc, emit: Emitter<AuthState>) {
    // LATER(part 2): authLogger.i("AttemptLogOutEvent shouldLogOut=$shouldLogOut").
    if (this.shouldLogOut) {
      emit(new IsOnWelcomeScreenState());
      return;
    }
    bloc.showMessage({
      kind: 'PopupDialog',
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      onOkay: () => {
        logOut(bloc);
      },
    });
  }
}

async function logOut(bloc: AuthBloc): Promise<void> {
  // LATER(part 2): authLogger.i("Starting log out method").
  // LATER(part 14): the push token. Read it (getFCMToken; a failed read counts as none); if
  // there is one, deleteMessagingData(token, 'token'); then, as shouldUnsubFromNotifications is
  // true, FirebaseMessaging.deleteToken(). A failure in any of it is only logged.

  // Two guards, because the failures are not equivalent. The refresh token lasts 180 days with
  // rotation, so a log-out that leaves it behind signs the user straight back in on the next
  // launch: Log Out has to mean it or say it did not work. It goes first so that if only the
  // access-token delete fails, what is left expires on its own and cannot be refreshed.
  try {
    await SecureStorage.deleteRefreshToken();
    await SecureStorage.deleteAccessToken();
  } catch {
    // LATER(part 2): authLogger.e("Log out could not clear the session: $e").
    bloc.showMessage({
      kind: 'PopupError',
      title: 'Could Not Sign Out',
      message: 'Your session could not be cleared. Please try again.',
    });
    return;
  }

  // Best effort from here: nothing below can leave a usable session behind.
  try {
    // LATER(part 14): SecureStorage.deleteFCMToken().
    await SecureStorage.purgeLegacyCredentials();
    // Otherwise the next account on this device inherits a gate it never opted into, and is never
    // offered the opt-in because the preference is no longer null.
    await SecureStorage.deleteBiometricsEnabled();
  } catch {
    // LATER(part 2): authLogger.w("Log out could not fully clear local state: $e").
  }
  bloc.add(new AttemptLogOutEvent(true));
  // LATER(part 2): authLogger.i("Finished log out method").
}
