// Provides the AuthBloc to screens, like flutter_bloc's BlocProvider / context.read<AuthBloc>().

import React, { createContext, useContext } from 'react';

import type { AuthBloc } from './authBloc';

const AuthBlocContext = createContext<AuthBloc | null>(null);

export function AuthBlocProvider({
  bloc,
  children,
}: {
  bloc: AuthBloc;
  children: React.ReactNode;
}) {
  return (
    <AuthBlocContext.Provider value={bloc}>{children}</AuthBlocContext.Provider>
  );
}

export function useAuthBloc(): AuthBloc {
  const bloc = useContext(AuthBlocContext);
  if (bloc === null) {
    throw new Error('useAuthBloc used outside AuthBlocProvider');
  }
  return bloc;
}
