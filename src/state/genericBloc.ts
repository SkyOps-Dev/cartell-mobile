// Port of GenericBloc (frontend/lib/bloc/shared/*) on top of flutter_bloc 8 semantics
// (spec 06 §1). The app navigates by state: the screen shown is a function of the current state.
//
// - Every event runs its handler at once (flutter_bloc's default concurrent transformer).
// - emit() skips a state equal to the current one (Equatable: same class and equal props),
//   except the very first emit. Late emits after the handler finished are dropped.
// - A handler error goes to onErrorDuringEventHandle (logged by default).
// - Back-stack: non-poppable states stay off it; a state of the same class replaces the top.
//   popState(n) pops n + 1 and returns the last popped (or the fallback when only one is left).

let lastTimestamp = 0;

/**
 * A state's `timestamp = DateTime.now()` prop, whose job is to make every emitted state distinct.
 * DateTime.now() is microseconds in Dart; this counts upward instead, so two states made in the
 * same millisecond still differ.
 */
export function stateTimestamp(): number {
  lastTimestamp = Math.max(lastTimestamp + 1, Date.now());
  return lastTimestamp;
}

export abstract class GenericState {
  readonly isPoppable: boolean;
  constructor(isPoppable = true) {
    this.isPoppable = isPoppable;
  }
  /** Equatable props. Subclasses append their fields. */
  get props(): unknown[] {
    return [this.isPoppable];
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((value, i) => deepEqual(value, b[i]))
    );
  }
  if (a instanceof GenericState && b instanceof GenericState) {
    return statesEqual(a, b);
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    return (
      keysA.length === keysB.length &&
      keysA.every(key =>
        deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
      )
    );
  }
  return false;
}

export function statesEqual(a: GenericState, b: GenericState): boolean {
  return a.constructor === b.constructor && deepEqual(a.props, b.props);
}

export type Emitter<S> = ((state: S) => void) & { readonly isDone: boolean };

export interface GenericEvent<S extends GenericState, B> {
  handleEvent(bloc: B, emit: Emitter<S>): Promise<void>;
}

export class GenericBloc<S extends GenericState> {
  private current: S;
  private emitted = false;
  private closed = false;
  private stack: S[] = [];
  private listeners = new Set<() => void>();

  constructor(startingState: S, readonly fallbackState: S) {
    this.current = startingState;
  }

  get state(): S {
    return this.current;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** For useSyncExternalStore. */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = () => this.current;

  add(event: GenericEvent<S, this>): void {
    if (this.closed) {
      return;
    }
    let done = false;
    const emit = ((state: S) => {
      if (done || this.closed) {
        return;
      }
      this.emitState(state);
    }) as Emitter<S>;
    Object.defineProperty(emit, 'isDone', { get: () => done || this.closed });
    event
      .handleEvent(this, emit)
      .catch(error => this.onErrorDuringEventHandle(error))
      .finally(() => {
        done = true;
      });
  }

  protected onErrorDuringEventHandle(error: unknown): void {
    // Logged only, as Flutter does; console.error would raise React Native's debug error box.
    console.log(`Error in generic bloc ${String(error)}`);
  }

  private emitState(next: S) {
    if (this.emitted && statesEqual(next, this.current)) {
      return;
    }
    this.emitted = true;
    this.current = next;
    this.onTransition(next);
    this.listeners.forEach(listener => listener());
  }

  private onTransition(next: S) {
    if (!next.isPoppable) {
      return;
    }
    const top = this.stack[this.stack.length - 1];
    if (top !== undefined && top.constructor === next.constructor) {
      this.stack.pop();
    }
    this.stack.push(next);
  }

  popState(numberOfPops = 1): S {
    if (this.stack.length === 1) {
      return this.fallbackState;
    }
    if (numberOfPops <= 0) {
      throw new Error('Cannot pop less than one state of stack');
    }
    let state = this.stack[this.stack.length - 1];
    for (let i = 0; i < numberOfPops + 1; i++) {
      if (this.stack.length === 0) {
        throw new Error('Stack is empty');
      }
      state = this.stack[this.stack.length - 1];
      this.stack.pop();
    }
    return state;
  }

  close() {
    this.closed = true;
  }
}
