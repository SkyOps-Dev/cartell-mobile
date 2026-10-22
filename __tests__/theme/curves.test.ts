// Flutter's cubic curves (curves.ts). The bisection never ends for an input outside 0–1, and on
// the UI thread that froze the app until Android killed it (the Account Settings switches,
// 2026-10-22): Reanimated's linear withTiming can step a hair past its start on its first frame.

import {
  clampUnit,
  Curves,
  transformCubic,
  transformFlipped,
} from '../../src/theme/curves';

test('matches Flutter at known points', () => {
  // Curves.easeInOut is symmetric; ease-out-back overshoots past 1.
  expect(transformCubic(Curves.easeInOut, 0.5)).toBeCloseTo(0.5, 2);
  expect(transformCubic(Curves.easeOutBack, 0.6)).toBeGreaterThan(1);
  expect(transformFlipped(Curves.easeOutBack, 0.4)).toBeLessThan(0);
});

test.each([-0.08, -1e-9, 1 + 1e-9, 1.03, NaN, -Infinity, Infinity])(
  'an input of %p ends, clamped to 0 or 1',
  t => {
    for (const curve of Object.values(Curves)) {
      const value = transformCubic(curve, t);
      expect(value).toBe(t > 0.5 ? 1 : 0);
      expect(transformFlipped(curve, t)).toBe(t > 0.5 ? 1 : 0);
    }
  },
);

test('clampUnit keeps a controller value within 0–1', () => {
  expect(clampUnit(-0.05)).toBe(0);
  expect(clampUnit(0.25)).toBe(0.25);
  expect(clampUnit(1.2)).toBe(1);
});
