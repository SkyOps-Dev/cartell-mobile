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
  IsLoadingDevicesScreenState,
  IsOnDevicesHomeScreenState,
} from '../state/devices/devicesBloc';
import { DevicesScreen } from './devices/DevicesScreen';
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
  throw new Error(`Encountered Unknown State: ${state.constructor.name}`);
}

export function DevicesRouter({ bloc: firstBloc }: { bloc: DevicesBloc }) {
  const [bloc] = useState(firstBloc);
  const state = useSyncExternalStore(bloc.subscribe, bloc.getState);
  useEffect(() => () => bloc.close(), [bloc]);
  const { key, element } = screenFor(state);
  return (
    <PopScope canPop={false}>
      <CrossFadeSwitcher screenKey={key}>{element}</CrossFadeSwitcher>
    </PopScope>
  );
}
