// Provides the DevicesBloc to the Hubs screens, like the BlocProvider in DevicesBlocWidget and
// `context.read<DevicesBloc>()`.

import React, { createContext, useContext } from 'react';

import type { DevicesBloc } from './devicesBloc';

const DevicesBlocContext = createContext<DevicesBloc | null>(null);

export function DevicesBlocProvider({
  bloc,
  children,
}: {
  bloc: DevicesBloc;
  children: React.ReactNode;
}) {
  return (
    <DevicesBlocContext.Provider value={bloc}>
      {children}
    </DevicesBlocContext.Provider>
  );
}

/**
 * `context.read<DevicesBloc>` as a function: Flutter's screens read the bloc only when they use it
 * (a refresh, a tap), so a screen shown without one still builds.
 */
export function useReadDevicesBloc(): () => DevicesBloc {
  const bloc = useContext(DevicesBlocContext);
  return () => {
    if (bloc === null) {
      throw new Error('No DevicesBloc above this screen');
    }
    return bloc;
  };
}
