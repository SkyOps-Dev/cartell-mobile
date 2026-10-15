// Ported from frontend/test/utilities/AppWatchers/mode_debouncer_test.dart.
// Entering or leaving the unavailable group is immediate, so the user learns at once and recovery
// is never delayed. Only the switch BETWEEN the two unavailable modes is debounced, because that is
// the only transition a flaky connection oscillates on.

import { ModeDebouncer, ModeEmission } from '../../src/utilities/modeDebouncer';
import { Mode } from '../../src/utilities/modeWatcher';

const { emit, hold } = ModeEmission;

describe('no-op transitions', () => {
  test('the initial NORMAL reading holds', () => {
    expect(new ModeDebouncer().consider(Mode.NORMAL)).toBe(hold);
  });

  test('a repeated unavailable reading holds', () => {
    const d = new ModeDebouncer();
    expect(d.consider(Mode.UNREACHABLE)).toBe(emit);
    expect(d.consider(Mode.UNREACHABLE)).toBe(hold);
    expect(d.consider(Mode.UNREACHABLE)).toBe(hold);
  });
});

describe('entering and leaving the unavailable group is immediate', () => {
  test('NORMAL to UNREACHABLE emits at once', () => {
    expect(new ModeDebouncer().consider(Mode.UNREACHABLE)).toBe(emit);
  });

  test('NORMAL to MAINTENANCE_MODE emits at once', () => {
    expect(new ModeDebouncer().consider(Mode.MAINTENANCE_MODE)).toBe(emit);
  });

  test('UNREACHABLE back to NORMAL emits at once', () => {
    const d = new ModeDebouncer();
    d.consider(Mode.UNREACHABLE);
    expect(d.consider(Mode.NORMAL)).toBe(emit);
  });

  test('MAINTENANCE_MODE back to NORMAL emits at once', () => {
    const d = new ModeDebouncer();
    d.consider(Mode.MAINTENANCE_MODE);
    expect(d.consider(Mode.NORMAL)).toBe(emit);
  });
});

describe('switching between the two unavailable modes needs two agreeing probes', () => {
  test('a single disagreeing probe holds', () => {
    const d = new ModeDebouncer();
    d.consider(Mode.UNREACHABLE);
    expect(d.consider(Mode.MAINTENANCE_MODE)).toBe(hold);
  });

  test('two consecutive agreeing probes emit', () => {
    const d = new ModeDebouncer();
    d.consider(Mode.UNREACHABLE);
    expect(d.consider(Mode.MAINTENANCE_MODE)).toBe(hold);
    expect(d.consider(Mode.MAINTENANCE_MODE)).toBe(emit);
    expect(d.lastEmitted).toBe(Mode.MAINTENANCE_MODE);
  });

  test('an oscillating connection never emits', () => {
    const d = new ModeDebouncer();
    expect(d.consider(Mode.UNREACHABLE)).toBe(emit);
    for (let i = 0; i < 5; i++) {
      expect(d.consider(Mode.MAINTENANCE_MODE)).toBe(hold);
      expect(d.consider(Mode.UNREACHABLE)).toBe(hold);
    }
    expect(d.lastEmitted).toBe(Mode.UNREACHABLE);
  });

  test('returning to NORMAL mid-debounce still emits at once', () => {
    const d = new ModeDebouncer();
    d.consider(Mode.UNREACHABLE);
    d.consider(Mode.MAINTENANCE_MODE);
    expect(d.consider(Mode.NORMAL)).toBe(emit);
    expect(d.lastEmitted).toBe(Mode.NORMAL);
  });

  test('a pending candidate is discarded when the reading reverts', () => {
    const d = new ModeDebouncer();
    d.consider(Mode.UNREACHABLE);
    d.consider(Mode.MAINTENANCE_MODE);
    d.consider(Mode.UNREACHABLE);
    expect(d.consider(Mode.MAINTENANCE_MODE)).toBe(hold);
  });
});
