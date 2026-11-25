// Port of PairingStep from frontend/lib/components/pairing/pairing_step_scaffold.dart: where a
// pairing screen sits in the wizard ("Step 4 of 6"), compared by value.

export class PairingStep {
  constructor(readonly index: number, readonly total: number) {}

  /** A screen that is an outcome rather than progress. */
  static none(): PairingStep {
    return new PairingStep(0, 0);
  }

  get isNumbered(): boolean {
    return this.index > 0 && this.total > 0;
  }

  equals(other: PairingStep): boolean {
    return other.index === this.index && other.total === this.total;
  }
}
