// Port of frontend/lib/utilities/AppWatchers/mode_debouncer.dart: whether a freshly probed Mode
// should reach the UI. Suppresses takeover-screen flicker on a marginal connection.
//
// MAINTENANCE_MODE and UNREACHABLE are both "server not available", and a device behind a flaky
// load balancer alternates between them every probe. Entering or leaving that group is reported
// at once; switching within it needs two consecutive agreeing probes.

import { Mode } from './modeWatcher';

export enum ModeEmission {
  emit = 'emit',
  hold = 'hold',
}

const isUnavailable = (mode: Mode) =>
  mode === Mode.MAINTENANCE_MODE || mode === Mode.UNREACHABLE;

export class ModeDebouncer {
  private emitted: Mode;
  private candidate: Mode | null = null;
  private agreementCount = 0;

  constructor(initial: Mode = Mode.NORMAL) {
    this.emitted = initial;
  }

  /** The mode the UI is currently showing. */
  get lastEmitted(): Mode {
    return this.emitted;
  }

  consider(incoming: Mode): ModeEmission {
    if (this.emitted === incoming) {
      this.clearCandidate();
      return ModeEmission.hold;
    }
    // Entering or leaving the unavailable group: report at once, so recovery is never delayed.
    if (!isUnavailable(this.emitted) || !isUnavailable(incoming)) {
      this.emit(incoming);
      return ModeEmission.emit;
    }
    // Both unavailable, but a different flavour: require agreement.
    if (this.candidate === incoming) {
      this.agreementCount++;
    } else {
      this.candidate = incoming;
      this.agreementCount = 1;
    }
    if (this.agreementCount >= 2) {
      this.emit(incoming);
      return ModeEmission.emit;
    }
    return ModeEmission.hold;
  }

  private emit(mode: Mode) {
    this.emitted = mode;
    this.clearCandidate();
  }

  private clearCandidate() {
    this.candidate = null;
    this.agreementCount = 0;
  }
}
