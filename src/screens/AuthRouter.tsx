// Port of AuthBlocWidget (frontend/lib/screens/bloc_widgets/auth_bloc_widget.dart; spec 06 §6):
// creates the AuthBloc, draws its messages as popups (drawMessage), and shows the screen for the
// current state inside a 300 ms cross-fade. An unknown state throws, as in Flutter.
// No Back handling here: on these screens Android Back closes the app, as in Flutter.
//
// Server mode (updateMode): every probe result reaches here through ModeWatcherHelper and passes
// the ModeDebouncer; an emitted MAINTENANCE_MODE / UNREACHABLE adds MaintenanceModeEvent, and
// NORMAL adds AutoLoginEvent, so recovery runs the whole sign-in again.

import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { CrossFadeSwitcher } from '../components/CrossFadeSwitcher';
import { drawMessage } from '../components/popups/messages';
import {
  AuthBloc,
  AuthState,
  AutoLoginEvent,
  IsInMaintenanceMode,
  IsLoadingAppState,
  IsLockedState,
  IsOnDevicesScreenState,
  IsOnLoginScreenState,
  IsOnRegistrationScreenState,
  IsOnWelcomeScreenState,
  MaintenanceModeEvent,
} from '../state/auth/authBloc';
import { AuthBlocProvider } from '../state/auth/AuthBlocContext';
import { ModeDebouncer, ModeEmission } from '../utilities/modeDebouncer';
import { Mode, ModeWatcherHelper } from '../utilities/modeWatcher';
import { MainAppRouter } from './MainAppRouter';
import { LoadScreen } from './welcome/LoadScreen';
import { LockScreen } from './welcome/LockScreen';
import { MaintenanceModeScreen } from './welcome/MaintenanceModeScreen';
import { LoginScreen } from './welcome/LoginScreen';
import { RegistrationScreen } from './welcome/RegistrationScreen';
import { WelcomeScreen } from './welcome/WelcomeScreen';

function screenFor(state: AuthState): {
  key: string;
  element: React.ReactElement;
} {
  if (state instanceof IsLoadingAppState) {
    return { key: 'LoadScreen', element: <LoadScreen /> };
  }
  if (state instanceof IsOnWelcomeScreenState) {
    return { key: 'WelcomeScreen', element: <WelcomeScreen /> };
  }
  if (state instanceof IsLockedState) {
    return {
      key: 'LockScreen',
      element: <LockScreen message={state.message} />,
    };
  }
  if (state instanceof IsOnLoginScreenState) {
    return {
      key: 'LoginScreen',
      element: (
        <LoginScreen
          temporaryEmail={state.temporaryEmail}
          emailError={state.emailError}
          passwordError={state.passwordError}
          isSubmitting={state.isSubmitting}
        />
      ),
    };
  }
  if (state instanceof IsOnRegistrationScreenState) {
    return {
      key: 'RegistrationScreen',
      element: (
        <RegistrationScreen
          temporaryEmail={state.email}
          temporaryFirstName={state.firstName}
          temporaryLastName={state.lastName}
          temporaryPhone={state.phoneNumber}
          isSubmitting={state.isSubmitting}
        />
      ),
    };
  }
  if (state instanceof IsOnDevicesScreenState) {
    return {
      key: 'MainAppBlocWidget',
      element: (
        <MainAppRouter mainAppBloc={state.bloc} devices={state.devices} />
      ),
    };
  }
  if (state instanceof IsInMaintenanceMode) {
    return {
      key: 'MaintenanceModeScreen',
      element: <MaintenanceModeScreen isUnreachable={state.isUnreachable} />,
    };
  }
  throw new Error(`Encountered Unknown State: ${state.constructor.name}`);
}

/** updateMode: the event a debounced mode change adds, or null to hold. */
export function eventForMode(
  debouncer: ModeDebouncer,
  mode: Mode,
): MaintenanceModeEvent | AutoLoginEvent | null {
  if (debouncer.consider(mode) === ModeEmission.hold) {
    return null;
  }
  switch (mode) {
    case Mode.MAINTENANCE_MODE:
      return new MaintenanceModeEvent(false);
    case Mode.UNREACHABLE:
      return new MaintenanceModeEvent(true);
    case Mode.NORMAL:
      return new AutoLoginEvent();
  }
}

export function AuthRouter() {
  const [bloc] = useState(() => new AuthBloc());
  const state = useSyncExternalStore(bloc.subscribe, bloc.getState);
  const debouncer = useRef(new ModeDebouncer()).current;

  useEffect(() => bloc.onMessage(drawMessage), [bloc]);

  useEffect(() => {
    const updateMode = (mode: Mode) => {
      const event = eventForMode(debouncer, mode);
      if (event !== null) {
        bloc.add(event);
      }
    };
    ModeWatcherHelper.addEventListener(updateMode);
    return () => ModeWatcherHelper.removeEventListener(updateMode);
  }, [bloc, debouncer]);

  const { key, element } = screenFor(state);
  return (
    <AuthBlocProvider bloc={bloc}>
      <CrossFadeSwitcher screenKey={key}>{element}</CrossFadeSwitcher>
    </AuthBlocProvider>
  );
}
