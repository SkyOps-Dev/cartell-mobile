// formatDateAndTime (text_formatters.dart): DateFormat('MM-dd-yyyy hh:mm a'), local time.

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
