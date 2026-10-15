// Port of Flutter's AutofillGroup(onDisposeAction: AutofillContextAction.cancel): the fields
// inside it are one credential for the password manager, and the context is cancelled when the
// group goes away (src/services/autofill.ts). It draws nothing itself.
//
// The cancel runs in a layout-effect cleanup, during the commit that removes the screen, so it
// reaches the platform before the fields leave the screen.

import React, { useCallback, useLayoutEffect, useState } from 'react';

import {
  closeAutofillGroup,
  createAutofillGroup,
  openAutofillGroup,
  registerAutofillField,
} from '../../services/autofill';

type Registrar = (field: { clear(): void }) => () => void;

/** Lets a text field inside the group register itself. Null outside any group. */
export const AutofillGroupContext = React.createContext<Registrar | null>(null);

export function AutofillGroup({ children }: { children: React.ReactNode }) {
  const [group] = useState(createAutofillGroup);
  useLayoutEffect(() => {
    openAutofillGroup(group);
    return () => closeAutofillGroup(group);
  }, [group]);
  const register = useCallback<Registrar>(
    field => registerAutofillField(group, field),
    [group],
  );
  return (
    <AutofillGroupContext.Provider value={register}>
      {children}
    </AutofillGroupContext.Provider>
  );
}
