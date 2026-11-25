// dart:convert's utf8, as the hub's string fields use it. Valid input is checked against Node's
// decoder; malformed input against the replacement rule both Dart and WHATWG use (one U+FFFD per
// maximal ill-formed subpart).

import {
  utf8DecodeAllowMalformed,
  utf8Encode,
} from '../../src/utilities/dartUtf8';

const bytes = (...values: number[]) => Uint8Array.from(values);

// Named rather than written as escapes: Prettier turns '\uXXXX' into the invisible character.
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);
const R = String.fromCharCode(0xfffd);

test('encodes as UTF-8, a lone surrogate as U+FFFD', () => {
  expect(Array.from(utf8Encode('aé☕🔒'))).toEqual(
    Array.from(Buffer.from('aé☕🔒', 'utf8')),
  );
  expect(Array.from(utf8Encode('\ud800'))).toEqual([0xef, 0xbf, 0xbd]);
});

test('decodes valid UTF-8 of every length, astral characters included', () => {
  for (const text of [
    '',
    'Home Wifi',
    'café',
    '☕ cup',
    '🔒 lock',
    '\u0000a',
  ]) {
    expect(utf8DecodeAllowMalformed(Buffer.from(text, 'utf8'))).toBe(text);
  }
});

test('keeps a byte-order mark, as Dart does', () => {
  expect(utf8DecodeAllowMalformed(bytes(0xef, 0xbb, 0xbf, 0x61))).toBe(
    `${BYTE_ORDER_MARK}a`,
  );
});

test('replaces each malformed subpart with one U+FFFD', () => {
  // A stray continuation byte, and an invalid lead byte.
  expect(utf8DecodeAllowMalformed(bytes(0x61, 0x80, 0x62))).toBe(`a${R}b`);
  expect(utf8DecodeAllowMalformed(bytes(0xc0, 0xff))).toBe(`${R}${R}`);
  // A truncated three-byte sequence is one subpart, then the next byte starts afresh.
  expect(utf8DecodeAllowMalformed(bytes(0xe2, 0x98, 0x61))).toBe(`${R}a`);
  // Truncated at the very end.
  expect(utf8DecodeAllowMalformed(bytes(0x61, 0xf0, 0x9f, 0x94))).toBe(`a${R}`);
  // An encoded surrogate (ED A0 80) is three subparts.
  expect(utf8DecodeAllowMalformed(bytes(0xed, 0xa0, 0x80))).toBe(R.repeat(3));
  // An overlong form (E0 80 80) is three subparts.
  expect(utf8DecodeAllowMalformed(bytes(0xe0, 0x80, 0x80))).toBe(R.repeat(3));
});

test('matches Node on random bytes (Node also follows the maximal-subpart rule)', () => {
  let seed = 12345;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % 256;
  };
  for (let round = 0; round < 500; round++) {
    const input = Uint8Array.from({ length: 1 + (next() % 40) }, next);
    expect(utf8DecodeAllowMalformed(input)).toBe(
      new TextDecoder('utf-8', { ignoreBOM: true }).decode(input),
    );
  }
});
