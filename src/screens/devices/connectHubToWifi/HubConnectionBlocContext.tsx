// The pairing wizard's bloc for its screens, like the BlocProvider in hub_connect_widget.dart:
// `context.read<HubConnectionBloc>()` and, for screens that redraw on every state,
// `context.watch<HubConnectionBloc>()`.

import React, { createContext, useContext, useSyncExternalStore } from 'react';

import type { HubConnectionBloc } from './hubConnectionBloc';
import type { HubConnectionState } from './states';

const HubConnectionBlocContext = createContext<HubConnectionBloc | null>(null);

export function HubConnectionBlocProvider({
  bloc,
  children,
}: {
  bloc: HubConnectionBloc;
  children: React.ReactNode;
}) {
  return (
    <HubConnectionBlocContext.Provider value={bloc}>
      {children}
    </HubConnectionBlocContext.Provider>
  );
}

/** context.read<HubConnectionBloc>(). */
export function useHubConnectionBloc(): HubConnectionBloc {
  const bloc = useContext(HubConnectionBlocContext);
  if (bloc === null) {
    throw new Error('No HubConnectionBloc above this screen');
  }
  return bloc;
}

/**
 * context.read<HubConnectionBloc>() as a function, for a screen that also opens with no wizard
 * above it (the failure page from Add Hub) and reads the bloc only when tapped.
 */
export function useReadHubConnectionBloc(): () => HubConnectionBloc {
  const bloc = useContext(HubConnectionBlocContext);
  return () => {
    if (bloc === null) {
      throw new Error('No HubConnectionBloc above this screen');
    }
    return bloc;
  };
}

/** context.watch<HubConnectionBloc>(): the bloc, redrawing on every state it emits. */
export function useWatchHubConnectionBloc(): [
  HubConnectionBloc,
  HubConnectionState,
] {
  const bloc = useHubConnectionBloc();
  const state = useSyncExternalStore(bloc.subscribe, bloc.getState);
  return [bloc, state];
}
