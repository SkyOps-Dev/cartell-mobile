// Port of AutoSwitch (frontend/lib/components/forms/auto_switch.dart; spec 07 §6): a Material
// Switch with an amber thumb that flips at once, runs `processTap`, and on failure flips back and
// shows the first failure message (or "Failed to switch.") in a toast; on success it shows the
// success text. There is no guard against a second tap while the first is running.
// Not ported: the `value:` form (every caller passes a controller).
//
// SynchronizedAutoSwitch ties the switch to one field of a cached model (SynchronizingController):
// the switch shows the field, a tap writes it into the model (and tells the model's listeners, so
// other screens follow), and a change made to the model elsewhere moves the switch. Flutter makes a
// new controller on every build, each one listening to the model for good; here there is one per
// model while the switch is up, which behaves the same.

import React, { useEffect, useRef, useState } from 'react';

import type { AbstractModel } from '../../models/abstractModel';
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

/**
 * SynchronizingController: a ValueNotifier mirroring one field of a model. Setting it writes the
 * field and tells the model's listeners before its own; a change to the model sets it.
 */
export class SynchronizingController<
  O extends AbstractModel,
  P,
> extends ValueNotifier<P> {
  constructor(
    readonly obj: O,
    private readonly get: (obj: O) => P,
    private readonly set: (obj: O, value: P) => void,
  ) {
    super(get(obj));
  }

  readonly handleObjectUpdate = () => {
    this.value = this.get(this.obj);
  };

  protected notifyListeners(): void {
    this.set(this.obj, this.value);
    this.obj.triggerFrontEndRebuild();
    super.notifyListeners();
  }
}

type SynchronizedProps<O extends AbstractModel> = {
  obj: O;
  getOnObject: (obj: O) => boolean;
  setOnObject: (obj: O, value: boolean) => void;
  processTap: (value: boolean) => Promise<ResultOf<string>>;
};

export function SynchronizedAutoSwitch<O extends AbstractModel>({
  obj,
  getOnObject,
  setOnObject,
  processTap,
}: SynchronizedProps<O>) {
  // The newest functions, as each Flutter build passes its own.
  const accessors = useRef({ getOnObject, setOnObject });
  accessors.current = { getOnObject, setOnObject };
  const synchronize = (model: O) =>
    new SynchronizingController<O, boolean>(
      model,
      m => accessors.current.getOnObject(m),
      (m, value) => accessors.current.setOnObject(m, value),
    );
  const [controller, setController] = useState(() => synchronize(obj));
  if (controller.obj !== obj) {
    setController(synchronize(obj));
  }
  useEffect(() => {
    controller.handleObjectUpdate();
    obj.addListener(controller.handleObjectUpdate);
    return () => obj.removeListener(controller.handleObjectUpdate);
  }, [obj, controller]);

  return <AutoSwitch boolController={controller} processTap={processTap} />;
}
