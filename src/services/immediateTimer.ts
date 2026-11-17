// Port of frontend/lib/services/immediate_timer.dart: Timer.periodic, except that the callback
// also runs once at once, before the first period has passed.
//
// As with Dart's Timer.periodic, the period does not wait for the callback: an async callback that
// takes longer than the period overlaps the next one (Add Sensor's search does).

export class ImmediateTimer {
  private readonly handle: ReturnType<typeof setInterval>;
  private active = true;

  /** ImmediateTimer.periodic(duration:, function:). */
  constructor({
    durationMs,
    callback,
  }: {
    durationMs: number;
    callback: (timer: ImmediateTimer) => void;
  }) {
    this.handle = setInterval(() => callback(this), durationMs);
    callback(this);
  }

  cancel(): void {
    this.active = false;
    clearInterval(this.handle);
  }

  get isActive(): boolean {
    return this.active;
  }
}
