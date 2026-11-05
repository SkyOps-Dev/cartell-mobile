// Port of DevicesBlocWidget (frontend/lib/screens/bloc_widgets/devices_bloc_widget.dart; spec 06
// §6): shows the screen for the DevicesBloc's state inside a 300 ms cross-fade, under a PopScope
// that keeps Back on the page. An unknown state throws, as in Flutter.
//
// BlocProvider(create: (context) => widget.bloc) keeps the first bloc it is given for as long as it
// is mounted (later ones, made by MainAppRouter on a rebuild, are never shown), and closes it when
// it goes.
// Its drawMessage method is never called in Flutter (nothing subscribes it), so it is not ported.

import React, { useEffect, useState, useSyncExternalStore } from 'react';

import { CrossFadeSwitcher } from '../components/CrossFadeSwitcher';
import { PopScope } from '../components/layout/PopScope';
import {
  DevicesBloc,
  DevicesState,
  IsAddingAHubState,
  IsLoadingDevicesScreenState,
  IsOnAddHubSuccessScreen,
  IsOnAboutDeviceScreenState,
  IsOnDeviceSettingsScreen,
  IsOnDevicesHomeScreenState,
  IsOnEditDeviceScreen,
  IsShowingADeviceState,
} from '../state/devices/devicesBloc';
import { DevicesBlocProvider } from '../state/devices/DevicesBlocContext';
import { AddDevice } from './devices/addDevice/AddDevice';
import { SuccessfullyAddedDeviceScreen } from './devices/addDevice/SuccessfullyAddedDeviceScreen';
import { DevicesScreen } from './devices/DevicesScreen';
import { DeviceMeta } from './devices/DeviceMeta';
import { DeviceSettingsScreen } from './devices/DeviceSettingsScreen';
import { DeviceView } from './devices/DeviceView';
import { EditDevice } from './devices/EditDevice';
import { LoadScreen } from './welcome/LoadScreen';

function screenFor(state: DevicesState): {
  key: string;
  element: React.ReactElement;
} {
  if (state instanceof IsLoadingDevicesScreenState) {
    return { key: 'LoadScreen', element: <LoadScreen /> };
  }
  if (state instanceof IsOnDevicesHomeScreenState) {
    return {
      key: 'DevicesScreen',
      element: <DevicesScreen devices={state.devices} />,
    };
  }
  if (state instanceof IsAddingAHubState) {
    return { key: 'AddDevice', element: <AddDevice /> };
  }
  if (state instanceof IsOnAddHubSuccessScreen) {
    return {
      key: 'SuccessfullyAddedDeviceScreen',
      element: <SuccessfullyAddedDeviceScreen device={state.device} />,
    };
  }
  if (state instanceof IsShowingADeviceState) {
    // One key for both of its states (checking, then ready), so the page stays mounted between
    // them, as Flutter updates the same DeviceView.
    return {
      key: 'DeviceView',
      element: <DeviceView device={state.device} refresh={state.refresh} />,
    };
  }
  if (state instanceof IsOnEditDeviceScreen) {
    return { key: 'EditDevice', element: <EditDevice device={state.device} /> };
  }
  if (state instanceof IsOnAboutDeviceScreenState) {
    // Both of its states (checking, then ready) update the same page.
    return {
      key: 'DeviceMeta',
      element: <DeviceMeta device={state.device} refresh={state.refresh} />,
    };
  }
  if (state instanceof IsOnDeviceSettingsScreen) {
    // Both of its states (checking, then ready) update the same page.
    return {
      key: 'DeviceSettingsScreen',
      element: (
        <DeviceSettingsScreen device={state.device} refresh={state.refresh} />
      ),
    };
  }
  throw new Error(`Encountered Unknown State: ${state.constructor.name}`);
}

export function DevicesRouter({ bloc: firstBloc }: { bloc: DevicesBloc }) {
  const [bloc] = useState(firstBloc);
  const state = useSyncExternalStore(bloc.subscribe, bloc.getState);
  useEffect(() => () => bloc.close(), [bloc]);
  const { key, element } = screenFor(state);
  return (
    <DevicesBlocProvider bloc={bloc}>
      <PopScope canPop={false}>
        <CrossFadeSwitcher screenKey={key}>{element}</CrossFadeSwitcher>
      </PopScope>
    </DevicesBlocProvider>
  );
}
