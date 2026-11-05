// Port of frontend/lib/models/abstract_model.dart (spec 05 §2): a model the screens listen to.
// A re-fetched copy is merged into the one already held (updateModel), so every screen holding it
// shows the new values without being handed a new object.

import {
  IdDoesNotMatchForSomeReasonException,
  TypeDoesNotMatchForSomeReasonException,
} from '../services/exceptions';
import { ChangeNotifier } from '../utilities/changeNotifier';

export abstract class AbstractModel extends ChangeNotifier {
  /** When this copy came from the server (ms); a merge keeps the later of the two. */
  retrievedAt = Date.now();

  constructor(public id: number) {
    super();
  }

  /** Copies `model`'s fields (updateFields) into this one, then notifies. */
  updateModel(model: AbstractModel): void {
    if (this.constructor !== model.constructor) {
      throw new TypeDoesNotMatchForSomeReasonException(
        'Types do not match - cannot update fields',
      );
    }
    if (this.id !== model.id) {
      throw new IdDoesNotMatchForSomeReasonException(
        'IDs do not match - cannot update fields',
      );
    }
    this.retrievedAt = Math.max(this.retrievedAt, model.retrievedAt);
    this.updateFields(model);
    this.notifyListeners();
  }

  /** For a change made to the object in place. */
  triggerFrontEndRebuild(): void {
    this.notifyListeners();
  }

  /** Which fields a re-fetched copy overwrites. Each model lists its own. */
  abstract updateFields(model: AbstractModel): void;
}
