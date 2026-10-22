// Provides the MainAppBloc to the signed-in shell's screens and side menu, like the BlocProvider
// in MainAppBlocWidget and `context.read<MainAppBloc>()`.

import React, { createContext, useContext } from 'react';

import type { MainAppBloc } from './mainAppBloc';

const MainAppBlocContext = createContext<MainAppBloc | null>(null);

export function MainAppBlocProvider({
  bloc,
  children,
}: {
  bloc: MainAppBloc;
  children: React.ReactNode;
}) {
  return (
    <MainAppBlocContext.Provider value={bloc}>
      {children}
    </MainAppBlocContext.Provider>
  );
}

export function useMainAppBloc(): MainAppBloc {
  const bloc = useContext(MainAppBlocContext);
  if (bloc === null) {
    throw new Error('useMainAppBloc used outside MainAppBlocProvider');
  }
  return bloc;
}
