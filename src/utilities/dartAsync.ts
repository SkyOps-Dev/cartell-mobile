// The dart:async pieces the hub pairing flow leans on: Future.delayed, Timer.periodic (a timer the
// flow keeps in its TimerManager and stops by name) and Future.timeout (which rejects with
// dart:async's TimeoutException, a different class from the app's own TimeOutException).

/** Future.delayed(duration). */
export function futureDelayed(ms: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/** Dart's Timer: cancellable, and active until cancelled. ImmediateTimer has the same shape. */
export interface DartTimer {
  cancel(): void;
  readonly isActive: boolean;
}

/** Timer.periodic(duration, callback): the first call after one period, then every period. */
export class PeriodicTimer implements DartTimer {
  private readonly handle: ReturnType<typeof setInterval>;
  private active = true;

  constructor(periodMs: number, callback: (timer: PeriodicTimer) => void) {
    this.handle = setInterval(() => callback(this), periodMs);
  }

  cancel(): void {
    this.active = false;
    clearInterval(this.handle);
  }

  get isActive(): boolean {
    return this.active;
  }
}

/** dart:async's TimeoutException, as Future.timeout throws it. */
export class AsyncTimeoutException extends Error {
  constructor(readonly durationMs: number) {
    super(`Future not completed`);
    this.name = 'TimeoutException';
  }
}

/**
 * Future.timeout(duration): `future`'s outcome if it settles within `ms`, otherwise a rejection
 * with AsyncTimeoutException. The original keeps running; its late outcome is ignored.
 */
export function futureTimeout<T>(future: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AsyncTimeoutException(ms)), ms);
    future.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
