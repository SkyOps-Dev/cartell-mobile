// Port of Flutter's ValueNotifier (foundation/change_notifier.dart) and a hook standing in for
// ListenableBuilder: a value that tells its listeners when it changes. Setting the value it
// already holds notifies nobody, as in Flutter.

import { useSyncExternalStore } from 'react';

export class ValueNotifier<T> {
  private current: T;
  private readonly listeners = new Set<() => void>();

  constructor(value: T) {
    this.current = value;
  }

  get value(): T {
    return this.current;
  }

  set value(next: T) {
    if (Object.is(next, this.current)) {
      return;
    }
    this.current = next;
    this.listeners.forEach(listener => listener());
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getValue = () => this.current;
}

/** ListenableBuilder over a ValueNotifier: re-renders whenever its value changes. */
export function useValueListenable<T>(notifier: ValueNotifier<T>): T {
  return useSyncExternalStore(notifier.subscribe, notifier.getValue);
}
