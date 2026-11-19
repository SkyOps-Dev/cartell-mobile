// The determinate mode of CircularProgressIndicator (progress_indicator.dart, year2023), as the
// firmware update's ring uses it: the sweep, the track, the canvas and the semantics.

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import {
  CircularProgressIndicator,
  determinateSweep,
} from '../../src/components/progress/CircularProgressIndicator';

test('the sweep: clamp(value, 0, 1) × (2π − 0.001)', () => {
  const full = Math.PI * 2 - 0.001;
  expect(determinateSweep(0)).toBe(0);
  expect(determinateSweep(0.25)).toBeCloseTo(full / 4, 12);
  expect(determinateSweep(1.024)).toBe(full);
  expect(determinateSweep(-1)).toBe(0);
});

test('a track circle on the box’s edge, the stroke half outside; a progress bar 0 to 100', async () => {
  await render(
    <CircularProgressIndicator
      size={280}
      strokeWidth={15}
      value={0.5}
      color="#FFB500"
      backgroundColor="#54585A"
      semanticsLabel="Firmware update progress"
      semanticsValue="50"
    />,
  );
  const bar = screen.getByRole('progressbar', {
    name: 'Firmware update progress',
  });
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
  expect(StyleSheet.flatten(bar.props.style)).toMatchObject({
    width: 280,
    height: 280,
  });
  const json = JSON.stringify(screen.toJSON());
  // The canvas: 280 + 15, pulled back by 7.5 on every side; the track's radius is 140.
  expect(json).toContain('"width":295');
  expect(json).toContain('"r":140');
  // The track in #54585A (0xFF54585A as react-native-svg passes it), under the amber arc.
  expect(json).toContain(`"payload":${0xff54585a}`);
  // Half a turn from 12 o'clock, clockwise, butt caps (0).
  expect(json).toContain('"strokeLinecap":0');
  expect(json).toContain('"d":"M 147.5 7.5 A 140 140 0 0 1 147.5');
});

test('without a value it is the indeterminate spinner', async () => {
  await render(<CircularProgressIndicator />);
  expect(
    StyleSheet.flatten(screen.getByRole('progressbar').props.style),
  ).toMatchObject({ width: 36, height: 36 });
  expect(
    screen.getByRole('progressbar').props.accessibilityValue,
  ).toBeUndefined();
});
