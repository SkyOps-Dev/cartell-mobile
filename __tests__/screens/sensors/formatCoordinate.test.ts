// Ported from frontend/test/screens/sensors/format_coordinate_test.dart
//
// Regression guard for a RangeError in the sensor location editor: formatCoordinate split on "."
// and indexed [1] unconditionally, so any input without a decimal point crashed. A sensor that has
// never been placed opens the editor with empty fields, so pressing Submit was enough.

import { formatCoordinate } from '../../../src/screens/sensors/EditCoordinates';

describe('formatCoordinate', () => {
  test('empty input does not throw', () => {
    expect(formatCoordinate('')).toBe('');
  });

  test('a whole number is returned untouched', () => {
    expect(formatCoordinate('40')).toBe('40');
    expect(formatCoordinate('-75')).toBe('-75');
  });

  test('trims to six decimal places', () => {
    expect(formatCoordinate('40.123456789')).toBe('40.123456');
    expect(formatCoordinate('-75.987654321')).toBe('-75.987654');
  });

  test('leaves six or fewer decimal places alone', () => {
    expect(formatCoordinate('40.123456')).toBe('40.123456');
    expect(formatCoordinate('40.1')).toBe('40.1');
  });

  test('a trailing decimal point does not throw', () => {
    expect(formatCoordinate('40.')).toBe('40.');
  });
});
