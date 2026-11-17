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
  IsAddingASensorName,
  IsEditingSensorCoordinatesState,
  IsOnEditSensorScreenState,
  IsOnSensorAboutScreenState,
  IsOnSensorConnectScreen,
  IsOnSensorsScreenState,
  IsOnSpecificDeviceHistoryScreenState,
  IsOnSpecificSensorHistoryScreenState,
  IsOnSpecificSensorScreenState,
  IsRemovingCaseForAddSensor,
} from '../state/devices/devicesBloc';
import { DevicesBlocProvider } from '../state/devices/DevicesBlocContext';
import { AddDevice } from './devices/addDevice/AddDevice';
import { SuccessfullyAddedDeviceScreen } from './devices/addDevice/SuccessfullyAddedDeviceScreen';
import { DevicesScreen } from './devices/DevicesScreen';
import { DeviceMeta } from './devices/DeviceMeta';
import { DeviceSettingsScreen } from './devices/DeviceSettingsScreen';
import { DeviceView } from './devices/DeviceView';
import { EditDevice } from './devices/EditDevice';
import { DeviceHistory } from './events/DeviceHistory';
import { SensorHistory } from './events/SensorHistory';
import { AddSensor } from './sensors/addSensor/AddSensor';
import { RemoveCaseForAddSensor } from './sensors/addSensor/RemoveCaseForAddSensor';
import { SensorConnectScreen } from './sensors/addSensor/SensorConnectScreen';
import { EditCoordinates } from './sensors/EditCoordinates';
import { EditSensor } from './sensors/EditSensor';
import { SensorMeta } from './sensors/SensorMeta';
import { SensorsScreen } from './sensors/SensorsScreen';
import { SensorView } from './sensors/SensorView';
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
  if (state instanceof IsOnSpecificDeviceHistoryScreenState) {
    // Both of its states (checking, then the first page) update the same screen.
    return {
      key: 'DeviceHistory',
      element: (
        <DeviceHistory
          event={state.event}
          device={state.device}
          refresh={state.refresh}
        />
      ),
    };
  }
  if (state instanceof IsOnSensorsScreenState) {
    // Both of its states (then the hub's re-check) update the same list.
    return {
      key: 'SensorsScreen',
      element: <SensorsScreen device={state.device} />,
    };
  }
  if (state instanceof IsOnSpecificSensorScreenState) {
    // Both of its states (checking, then ready) update the same page.
    return {
      key: 'SensorView',
      element: (
        <SensorView
          device={state.device}
          sensor={state.sensor}
          isOnboardSensor={state.sensor.isOnboardSensor()}
          refresh={state.refresh}
        />
      ),
    };
  }
  if (state instanceof IsEditingSensorCoordinatesState) {
    return {
      key: 'EditCoordinates',
      element: <EditCoordinates device={state.device} sensor={state.sensor} />,
    };
  }
  if (state instanceof IsOnSpecificSensorHistoryScreenState) {
    // Both of its states (checking, then the first page) update the same screen.
    return {
      key: 'SensorHistory',
      element: (
        <SensorHistory
          sensor={state.sensor}
          event={state.event}
          device={state.device}
          refresh={state.refresh}
        />
      ),
    };
  }
  if (state instanceof IsOnSensorAboutScreenState) {
    // Both of its states update the same page; its RefreshState is not passed, as in Flutter.
    return {
      key: 'SensorMeta',
      element: <SensorMeta device={state.device} sensor={state.sensor} />,
    };
  }
  if (state instanceof IsOnEditSensorScreenState) {
    return {
      key: 'EditSensor',
      element: <EditSensor device={state.device} sensor={state.sensor} />,
    };
  }
  if (state instanceof IsAddingASensorName) {
    return { key: 'AddSensor', element: <AddSensor device={state.device} /> };
  }
  if (state instanceof IsRemovingCaseForAddSensor) {
    return {
      key: 'RemoveCaseForAddSensor',
      element: (
        <RemoveCaseForAddSensor device={state.device} data={state.data} />
      ),
    };
  }
  if (state instanceof IsOnSensorConnectScreen) {
    return {
      key: 'SensorConnectScreen',
      element: <SensorConnectScreen device={state.device} data={state.data} />,
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
