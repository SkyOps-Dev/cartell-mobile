// DateTime.parse (dart:core), as read from date_time.dart: the formats it takes, UTC with a zone
// and local time without, six fraction digits truncated, fields rolling over, and FormatException.

import { FormatException } from '../../src/services/exceptions';
import { parseDartDateTime } from '../../src/utilities/dartDateTime';

const utc = (iso: string, micros = 0) => Date.parse(iso) * 1000 + micros;

test.each<[string, number]>([
  // Django's DateTimeField output, America/Chicago.
  ['2026-10-21T07:00:00.123456-05:00', utc('2026-10-21T12:00:00.123Z', 456)],
  ['2026-10-21T07:00:00-05:00', utc('2026-10-21T12:00:00Z')],
  ['2026-10-21T12:00:00Z', utc('2026-10-21T12:00:00Z')],
  ['2026-10-21 12:00:00z', utc('2026-10-21T12:00:00Z')],
  ['20261021T120000+0130', utc('2026-10-21T10:30:00Z')],
  ['2026-10-21T12:00+05', utc('2026-10-21T07:00:00Z')],
  ['2026-10-21T12:00:00,5Z', utc('2026-10-21T12:00:00.500Z')],
  // Past six digits the fraction is dropped, not rounded.
  ['2026-10-21T12:00:00.1234569Z', utc('2026-10-21T12:00:00.123Z', 456)],
  // Out-of-range fields roll over.
  ['2026-13-01T00:00:00Z', utc('2027-01-01T00:00:00Z')],
  ['2026-10-21T24:00:00Z', utc('2026-10-22T00:00:00Z')],
  ['+002026-10-21T00:00:00Z', utc('2026-10-21T00:00:00Z')],
])('%s is UTC', (text, micros) => {
  const parsed = parseDartDateTime(text);
  expect(parsed.isUtc).toBe(true);
  expect(parsed.microsecondsSinceEpoch).toBe(micros);
});

test('without a zone it is local time', () => {
  const parsed = parseDartDateTime('2026-10-21T07:00:00');
  expect(parsed.isUtc).toBe(false);
  expect(parsed.microsecondsSinceEpoch).toBe(
    new Date(2026, 9, 21, 7, 0, 0).getTime() * 1000,
  );
});

test.each([
  '',
  '2026-10-21T',
  '2026/10/21',
  '2026-10-21T12:00:00 +05:00:00',
  '21 Oct 2026',
  '١٢٣٤-10-21',
])('%j throws FormatException', text => {
  expect(() => parseDartDateTime(text)).toThrow(FormatException);
});
