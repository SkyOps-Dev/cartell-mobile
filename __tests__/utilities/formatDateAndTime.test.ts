// formatDateAndTime (text_formatters.dart): DateFormat('MM-dd-yyyy hh:mm a'), local time.

import { parseDartDateTime } from '../../src/utilities/dartDateTime';
import { formatDateAndTime } from '../../src/utilities/textFormatters';

test.each<[Date, string]>([
  [new Date(2026, 10, 5, 15, 42), '11-05-2026 03:42 PM'],
  [new Date(2026, 0, 9, 0, 5), '01-09-2026 12:05 AM'],
  [new Date(2026, 0, 9, 12, 0), '01-09-2026 12:00 PM'],
  [new Date(2026, 11, 31, 11, 59), '12-31-2026 11:59 AM'],
  [new Date(2026, 6, 4, 23, 7), '07-04-2026 11:07 PM'],
])('%s reads as %s', (date, expected) => {
  expect(formatDateAndTime(date)).toBe(expected);
});

// A DartDateTime is shown in its own zone, as DateFormat reads its fields: a server date with an
// offset parses as UTC and shows UTC clock time, not the phone's (Q43, sensor About's "Date
// Paired"); one without an offset is local.
test('a UTC DartDateTime shows UTC clock time (Q43)', () => {
  expect(
    formatDateAndTime(parseDartDateTime('2026-11-12T06:00:59.073000-06:00')),
  ).toBe('11-12-2026 12:00 PM');
});

test('a local DartDateTime shows local time', () => {
  expect(formatDateAndTime(parseDartDateTime('2026-11-12T06:00:59'))).toBe(
    '11-12-2026 06:00 AM',
  );
});
