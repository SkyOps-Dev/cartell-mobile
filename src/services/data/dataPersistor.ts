// Port of frontend/lib/services/data/data_persistor.dart (spec 05 §2): the in-memory cache of one
// model type, by id, in insertion order. Adding an id it already holds merges the new copy into
// the held object and hands that back, so there is only ever one object per id. The persistor
// notifies its own listeners when a model is added or removed, and whenever a held model does.

import type { AbstractModel } from '../../models/abstractModel';
import { ChangeNotifier } from '../../utilities/changeNotifier';
import { Result, ResultOf } from '../result';

export class DataPersistor<T extends AbstractModel> extends ChangeNotifier {
  readonly persistedData = new Map<number, T>();

  getById(id: number): ResultOf<T> {
    const held = this.persistedData.get(id);
    if (held === undefined) {
      return ResultOf.failure({ message: 'Obj does not exist.' });
    }
    return ResultOf.success(held);
  }

  getAll(): ResultOf<T[]> {
    return ResultOf.success([...this.persistedData.values()]);
  }

  /** Holds `data`, or merges it into the held object with its id. Returns the held object. */
  add(data: T): ResultOf<T> {
    const held = this.persistedData.get(data.id);
    if (held !== undefined) {
      held.updateModel(data);
      return ResultOf.success(held);
    }
    this.persistedData.set(data.id, data);
    data.addListener(this.notify);
    this.notify();
    return ResultOf.success(data);
  }

  remove(data: T): Result {
    if (!this.persistedData.has(data.id)) {
      return Result.failure({ message: 'Does not exist.' });
    }
    this.persistedData.delete(data.id);
    data.removeListener(this.notify);
    this.notifyListeners();
    return Result.success();
  }

  hasObj(id: number): boolean {
    return this.persistedData.has(id);
  }

  readonly notify = () => {
    this.notifyListeners();
  };
}
