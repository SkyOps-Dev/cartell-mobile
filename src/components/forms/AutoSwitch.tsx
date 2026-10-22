// Port of AutoSwitch (frontend/lib/components/forms/auto_switch.dart; spec 07 §6): a Material
// Switch with an amber thumb that flips at once, runs `processTap`, and on failure flips back and
// shows the first failure message (or "Failed to switch.") in a toast; on success it shows the
// success text. There is no guard against a second tap while the first is running.
// Not ported (unused by the screens built so far): SynchronizedAutoSwitch and
// SynchronizingController, and the `value:` form (Account Settings always passes a controller).
// LATER(part 26): SynchronizedAutoSwitch, with the hub settings that use it.

import React, { useEffect, useRef } from 'react';

import type { ResultOf } from '../../services/result';
import { kCartellYellow } from '../../theme/colors';
import {
  useValueListenable,
  ValueNotifier,
} from '../../utilities/valueNotifier';
import {
  showFailedToastPopup,
  showSuccessfulToastPopup,
} from '../popups/toasts';
import { Switch } from './Switch';

type Props = {
  boolController: ValueNotifier<boolean>;
  processTap: (value: boolean) => Promise<ResultOf<string>>;
};

export function AutoSwitch({ boolController, processTap }: Props) {
  const value = useValueListenable(boolController);
  // `widget` after an await is the newest one: Flutter reads widget.boolController there.
  const latest = useRef({ boolController, processTap });
  latest.current = { boolController, processTap };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onTap = async (next: boolean) => {
    const previousValue = latest.current.boolController.value;
    latest.current.boolController.value = next;
    const result = await latest.current.processTap(next);
    if (result.failed) {
      // The controller belongs to the caller and outlives this switch, so it is reset before
      // the mounted check.
      latest.current.boolController.value = previousValue;
      if (!mounted.current) {
        return;
      }
      showFailedToastPopup(
        result.messages.length > 0 ? result.messages[0] : 'Failed to switch.',
        { shouldDismiss: true },
      );
      return;
    }
    if (!mounted.current) {
      return;
    }
    showSuccessfulToastPopup(result.data, { shouldDismiss: true });
  };

  return (
    <Switch
      activeThumbColor={kCartellYellow}
      value={value}
      onChanged={next => {
        onTap(next);
      }}
    />
  );
}
