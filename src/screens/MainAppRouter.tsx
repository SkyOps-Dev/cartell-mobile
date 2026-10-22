// Port of MainAppBlocWidget (frontend/lib/screens/bloc_widgets/main_app_bloc_widget.dart; spec 06
// §6): the signed-in shell. Shows the screen for the MainAppBloc's state inside a 300 ms
// cross-fade, under a PopScope that keeps Back on the page (Back never closes the app from here).
// An unknown state throws, as in Flutter. The bloc is closed when the shell goes away (its
// BlocProvider(create:) closes it on dispose).
//
// The Hubs state makes a new DevicesBloc each time it is built, with the hubs fetched at sign-in,
// and points mainAppBloc.bloc at it. "Each time it is built" is each new Hubs state here: React may
// render more often than Flutter builds, and an extra DevicesBloc would fetch the hubs again.
// Account Settings shows its skeleton until both the user and the profile have landed; a build
// error there (quirk Q30) becomes Flutter's grey release ErrorWidget in place of the screen.
// The bloc is provided to every screen and the side menu (BlocProvider / context.read).
// LATER(part 35): Event History.
// LATER(part 20): Help (ContactUs).
// LATER(part 18): the Alexa cheat sheet.
// LATER(part 17): the hub light guide.

import React, { useEffect, useMemo, useSyncExternalStore } from 'react';

import { CrossFadeSwitcher } from '../components/CrossFadeSwitcher';
import { ErrorWidgetBoundary } from '../components/ErrorWidget';
import { PopScope } from '../components/layout/PopScope';
import type { RawDevice } from '../services/requests/deviceRequests';
import { DevicesBloc } from '../state/devices/devicesBloc';
import {
  IsLoadingMainAppState,
  IsOnAccountSettingsEditNameScreenState,
  IsOnAccountSettingsEditPasswordScreenState,
  IsOnAccountSettingsEditPhoneNumberScreenState,
  IsOnAccountSettingsScreenState,
  IsOnHubsScreenState,
  MainAppBloc,
  MainAppState,
} from '../state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../state/mainApp/MainAppBlocContext';
import { AccountSettings } from './account/AccountSettings';
import { AccountSettingsSkeleton } from './account/AccountSettingsSkeleton';
import { EditName } from './account/EditName';
import { EditPassword } from './account/EditPassword';
import { EditPhone } from './account/EditPhone';
import { DevicesRouter } from './DevicesRouter';
import { LoadScreen } from './welcome/LoadScreen';

export function MainAppRouter({
  mainAppBloc,
  devices,
}: {
  mainAppBloc: MainAppBloc;
  devices: RawDevice[];
}) {
  const state = useSyncExternalStore(
    mainAppBloc.subscribe,
    mainAppBloc.getState,
  );
  useEffect(() => () => mainAppBloc.close(), [mainAppBloc]);

  // Login already fetched the hubs; the DevicesBloc starts from that list.
  const devicesBloc = useMemo(() => {
    if (!(state instanceof IsOnHubsScreenState)) {
      return null;
    }
    const bloc = new DevicesBloc(mainAppBloc, devices);
    mainAppBloc.bloc = bloc;
    return bloc;
    // A new one per Hubs state, not per render (see the top of the file).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const { key, element } = screenFor(state, devicesBloc);
  return (
    <MainAppBlocProvider bloc={mainAppBloc}>
      <PopScope canPop={false}>
        <CrossFadeSwitcher screenKey={key}>{element}</CrossFadeSwitcher>
      </PopScope>
    </MainAppBlocProvider>
  );
}

function screenFor(
  state: MainAppState,
  devicesBloc: DevicesBloc | null,
): { key: string; element: React.ReactElement } {
  if (state instanceof IsLoadingMainAppState) {
    return { key: 'LoadScreen', element: <LoadScreen /> };
  }
  if (state instanceof IsOnHubsScreenState && devicesBloc !== null) {
    return {
      key: 'DevicesBlocWidget',
      element: <DevicesRouter bloc={devicesBloc} />,
    };
  }
  if (state instanceof IsOnAccountSettingsScreenState) {
    const { user, profile } = state;
    if (user === null || profile === null) {
      return {
        key: 'AccountSettingsSkeleton',
        element: <AccountSettingsSkeleton />,
      };
    }
    return {
      key: 'AccountSettings',
      element: (
        <ErrorWidgetBoundary>
          <AccountSettings user={user} profile={profile} />
        </ErrorWidgetBoundary>
      ),
    };
  }
  if (state instanceof IsOnAccountSettingsEditNameScreenState) {
    return { key: 'EditName', element: <EditName user={state.user} /> };
  }
  if (state instanceof IsOnAccountSettingsEditPasswordScreenState) {
    return {
      key: 'EditPassword',
      element: <EditPassword user={state.user} />,
    };
  }
  if (state instanceof IsOnAccountSettingsEditPhoneNumberScreenState) {
    return { key: 'EditPhone', element: <EditPhone user={state.user} /> };
  }
  throw new Error(`Encountered Unknown State: ${state.constructor.name}`);
}
