// Port of DateTime.parse (dart:core date_time.dart, Dart 3.11 as in Flutter 3.41.9), the one way
// the models read the server's dates. JS's Date.parse is not used: Hermes reads fewer formats than
// Dart, and Date keeps milliseconds where Dart keeps microseconds.

import { FormatException } from '../services/exceptions';

/** A Dart DateTime: microseconds since the epoch, and whether it is UTC (else local time). */
export class DartDateTime {
  constructor(
    readonly microsecondsSinceEpoch: number,
    readonly isUtc: boolean,
  ) {}

  /** DateTime.now(). */
  static now(): DartDateTime {
    return new DartDateTime(Date.now() * 1000, false);
  }

  /** As a JS Date (to the millisecond). */
  toDate(): Date {
    return new Date(Math.floor(this.microsecondsSinceEpoch / 1000));
  }
}

// DateTime._parseFormat.
const PARSE_FORMAT =
  /^([+-]?\d{4,6})-?(\d\d)-?(\d\d)(?:[ T](\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d+))?)?)?( ?[zZ]| ?([-+])(\d\d)(?::?(\d\d))?)?)?$/;

// DateTime's range: ±100,000,000 days from the epoch, in microseconds.
const MAX_MICROSECONDS = 8.64e18;

/**
 * DateTime.parse: an ISO-8601-like string. With a time zone (Z or ±hh[:mm]) the result is UTC,
 * otherwise local time. Out-of-range fields roll over (month 13 is January next year), as in
 * Dart. Fractions keep six digits, truncated. Anything else throws FormatException.
 */
export function parseDartDateTime(formattedString: string): DartDateTime {
  const match = PARSE_FORMAT.exec(formattedString);
  if (match === null) {
    throw new FormatException(`Invalid date format\n${formattedString}`);
  }
  const intOrZero = (s: string | undefined) =>
    s === undefined ? 0 : parseInt(s, 10);
  const years = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = intOrZero(match[4]);
  let minute = intOrZero(match[5]);
  const second = intOrZero(match[6]);
  const milliAndMicroseconds = parseMilliAndMicroseconds(match[7]);
  const millisecond = Math.trunc(milliAndMicroseconds / 1000);
  const microsecond = milliAndMicroseconds % 1000;
  let isUtc = false;
  if (match[8] !== undefined) {
    isUtc = true;
    const tzSign = match[9];
    if (tzSign !== undefined) {
      const sign = tzSign === '-' ? -1 : 1;
      const minuteDifference =
        intOrZero(match[11]) + 60 * parseInt(match[10], 10);
      minute -= sign * minuteDifference;
    }
  }
  const date = new Date(0);
  if (isUtc) {
    date.setUTCFullYear(years, month - 1, day);
    date.setUTCHours(hour, minute, second, millisecond);
  } else {
    date.setFullYear(years, month - 1, day);
    date.setHours(hour, minute, second, millisecond);
  }
  const microseconds = date.getTime() * 1000 + microsecond;
  if (Number.isNaN(microseconds) || Math.abs(microseconds) > MAX_MICROSECONDS) {
    throw new FormatException(`Time out of range\n${formattedString}`);
  }
  return new DartDateTime(microseconds, isUtc);
}

/** The first six digits of a fraction as microseconds; the rest are dropped. */
function parseMilliAndMicroseconds(matched: string | undefined): number {
  if (matched === undefined) {
    return 0;
  }
  let result = 0;
  for (let i = 0; i < 6; i++) {
    result *= 10;
    if (i < matched.length) {
      result += matched.charCodeAt(i) - 0x30;
    }
  }
  return result;
}
