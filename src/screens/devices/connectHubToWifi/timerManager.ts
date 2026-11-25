// Port of frontend/lib/screens/devices/connect_hub_to_wifi/timer_manager.dart: the pairing flow's
// running timers, by name, so any terminal path can stop them all.

import type { DartTimer } from '../../../utilities/dartAsync';

export type TimerEntry = { name: string; timer: DartTimer };

export class TimerManager {
  readonly entries: TimerEntry[] = [];

  addTimer(entry: TimerEntry): void {
    this.entries.push(entry);
  }

  removeTimer(entry: TimerEntry): void {
    const index = this.entries.indexOf(entry);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }
  }

  /** Cancels every timer still running. Entries stay listed, as in Flutter. */
  stopAll(): void {
    for (const entry of this.entries) {
      if (entry.timer.isActive) {
        entry.timer.cancel();
        // PORT-GAP: log.i("Stopped timer ${entry.name}") (the developer log).
      }
    }
  }
}
