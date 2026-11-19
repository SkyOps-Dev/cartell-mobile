// Port of frontend/lib/screens/devices/firmware_update/update_progress_snapshot.dart (spec 14 §3):
// one reading of an update's progress, as the poller hands it to the screen.

import {
  type FirmwareUpdateStatusCode,
  statusCodeText,
} from './firmwareUpdateStatusCode';

export class UpdateProgressSnapshot {
  constructor(
    readonly cursorPosition: number,
    readonly totalSize: number,
    readonly elapsedMilliseconds: number,
    readonly status: FirmwareUpdateStatusCode | null = null,
  ) {}

  /** cursor / total, or 0 before the size is known. Can pass 1 (the server's cursor overshoots). */
  get percentageDone(): number {
    if (this.totalSize === 0) {
      return 0;
    }
    return this.cursorPosition / this.totalSize;
  }

  /**
   * The time left in whole seconds, or null below 0.1%: (1/p − 1) × the whole seconds passed,
   * truncated, as Dart's `~/` and `toInt()`.
   */
  get estimatedTimeLeftSeconds(): number | null {
    if (this.percentageDone < 0.001) {
      return null;
    }
    const percentageWorkUndone = 1 / this.percentageDone - 1;
    const secondsPassed = Math.trunc(this.elapsedMilliseconds / 1000);
    // + 0: Dart's int has no negative zero.
    return Math.trunc(percentageWorkUndone * secondsPassed) + 0;
  }

  get isTotalFileSent(): boolean {
    return this.cursorPosition === this.totalSize;
  }

  toString(): string {
    const status = this.status === null ? 'null' : statusCodeText(this.status);
    return `cursorPosition=${this.cursorPosition},totalSize=${this.totalSize},elapsedMilliseconds=${this.elapsedMilliseconds},status=(${status})`;
  }
}
