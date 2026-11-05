// Port of Flutter's ChangeNotifier (foundation/change_notifier.dart) and a hook standing in for
// ListenableBuilder over one: listeners run synchronously, in the order they were added, each
// time notifyListeners() is called.

import { useSyncExternalStore } from 'react';

export class ChangeNotifier {
  private readonly listeners = new Set<() => void>();
  // Bumped on every notification, so a React snapshot changes even when the object does not.
  private version = 0;

  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  protected notifyListeners(): void {
    this.version++;
    [...this.listeners].forEach(listener => listener());
  }

  readonly subscribe = (listener: () => void) => {
    this.addListener(listener);
    return () => this.removeListener(listener);
  };

  readonly getVersion = () => this.version;
}

/** ListenableBuilder: re-renders whenever `notifier` notifies. */
export function useListenable(notifier: ChangeNotifier): void {
  useSyncExternalStore(notifier.subscribe, notifier.getVersion);
}
