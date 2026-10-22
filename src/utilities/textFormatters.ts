// Port of formatPhoneNumber from frontend/lib/utilities/text_formatters.dart (spec 11 §2).
// LATER(part 35): formatDateAndTime, with the event history.

/**
 * Ten characters that Dart's int.tryParse reads as a number become "(555) 123-4567"; anything
 * else non-empty comes back as it is, and an empty string gives null. Lengths are counted in
 * UTF-16 code units, as Dart counts them.
 */
export function formatPhoneNumber(phoneNumber: string): string | null {
  if (phoneNumber.length !== 10 || !isDartInt(phoneNumber)) {
    if (phoneNumber.length > 0) {
      return phoneNumber;
    }
    return null;
  }
  return `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(
    3,
    6,
  )}-${phoneNumber.substring(6)}`;
}

/** Dart's String.trim whitespace (the VM's _isWhitespace). */
function isDartWhitespace(code: number): boolean {
  return (
    (code >= 0x09 && code <= 0x0d) ||
    code === 0x20 ||
    code === 0x85 ||
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  );
}

/**
 * Whether Dart's `int.tryParse(source)` (no radix) returns a number: surrounding whitespace is
 * ignored, then an optional sign, then decimal digits, or "0x"/"0X" and hexadecimal digits. Ten
 * characters cannot overflow a 64-bit int, so the range is not checked.
 */
export function isDartInt(source: string): boolean {
  let start = 0;
  let end = source.length;
  while (start < end && isDartWhitespace(source.charCodeAt(start))) {
    start++;
  }
  while (end > start && isDartWhitespace(source.charCodeAt(end - 1))) {
    end--;
  }
  let body = source.slice(start, end);
  if (body.startsWith('+') || body.startsWith('-')) {
    body = body.slice(1);
  }
  return /^[0-9]+$/.test(body) || /^0[xX][0-9a-fA-F]+$/.test(body);
}
