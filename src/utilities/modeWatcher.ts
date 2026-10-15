// Port of frontend/lib/utilities/AppWatchers/mode_watcher.dart (spec 04 §6): the server mode
// enum and the singleton that knows whether the app is in the foreground or pairing, and fans out
// every mode probe result to listeners (AuthRouter, which shows the maintenance screen).

import { AppState, AppStateStatus } from 'react-native';

export enum Mode {
  NORMAL = 'NORMAL',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  /** No server answered at all (timeout, DNS failure, wrong Wi-Fi, stale dev IP). */
  UNREACHABLE = 'UNREACHABLE',
}

type Listener = (mode: Mode) => void;

class ModeWatcherHelperImpl {
  /** Flutter starts at AppLifecycleState.resumed. */
  currentState: AppStateStatus = 'active';
  isPairingDevices = false;
  private listeners: Listener[] = [];

  constructor() {
    AppState.addEventListener('change', state => {
      this.currentState = state;
    });
  }

  get isResumed(): boolean {
    return this.currentState === 'active';
  }

  addEventListener(listener: Listener) {
    this.listeners.push(listener);
  }

  /** Removes the first registration of `listener`, as Dart's List.remove does. */
  removeEventListener(listener: Listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners(mode: Mode) {
    // A copy, so a listener that removes itself does not skip the next one.
    [...this.listeners].forEach(listener => listener(mode));
  }
}

export const ModeWatcherHelper = new ModeWatcherHelperImpl();
