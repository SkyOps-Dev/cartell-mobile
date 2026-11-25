// dart:convert's utf8 (Dart 3.11, as in Flutter 3.41.9), for the hub's fixed-width string fields:
// utf8.encode, and utf8.decode with allowMalformed: true.
//
// Encoding uses TextEncoder, which writes a lone surrogate as U+FFFD exactly as Dart does.
// Decoding is written out because Hermes has no TextDecoder. Malformed input becomes U+FFFD, one
// per maximal ill-formed subpart (the WHATWG / Unicode recommended practice). Only junk from the
// hub could reach that path.

/* eslint-disable no-bitwise */ // UTF-8 decoding is bit work.

const encoder = new TextEncoder();

/** utf8.encode. */
export function utf8Encode(value: string): Uint8Array {
  return encoder.encode(value);
}

/** utf8.decode(bytes, allowMalformed: true). A leading byte-order mark is kept, as in Dart. */
export function utf8DecodeAllowMalformed(bytes: Uint8Array): string {
  const codeUnits: number[] = [];
  let codePoint = 0;
  let bytesNeeded = 0;
  let bytesSeen = 0;
  let lowerBoundary = 0x80;
  let upperBoundary = 0xbf;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (bytesNeeded === 0) {
      if (byte <= 0x7f) {
        codeUnits.push(byte);
      } else if (byte >= 0xc2 && byte <= 0xdf) {
        bytesNeeded = 1;
        codePoint = byte & 0x1f;
      } else if (byte >= 0xe0 && byte <= 0xef) {
        if (byte === 0xe0) lowerBoundary = 0xa0;
        if (byte === 0xed) upperBoundary = 0x9f;
        bytesNeeded = 2;
        codePoint = byte & 0x0f;
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        if (byte === 0xf0) lowerBoundary = 0x90;
        if (byte === 0xf4) upperBoundary = 0x8f;
        bytesNeeded = 3;
        codePoint = byte & 0x07;
      } else {
        codeUnits.push(0xfffd);
      }
      continue;
    }
    if (byte < lowerBoundary || byte > upperBoundary) {
      // The sequence so far is one ill-formed subpart; this byte starts afresh.
      codePoint = bytesNeeded = bytesSeen = 0;
      lowerBoundary = 0x80;
      upperBoundary = 0xbf;
      codeUnits.push(0xfffd);
      i--;
      continue;
    }
    lowerBoundary = 0x80;
    upperBoundary = 0xbf;
    codePoint = (codePoint << 6) | (byte & 0x3f);
    bytesSeen++;
    if (bytesSeen !== bytesNeeded) continue;
    if (codePoint > 0xffff) {
      const offset = codePoint - 0x10000;
      codeUnits.push(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
    } else {
      codeUnits.push(codePoint);
    }
    codePoint = bytesNeeded = bytesSeen = 0;
  }
  if (bytesNeeded !== 0) {
    codeUnits.push(0xfffd);
  }

  let result = '';
  for (let start = 0; start < codeUnits.length; start += 4096) {
    result += String.fromCharCode(...codeUnits.slice(start, start + 4096));
  }
  return result;
}
