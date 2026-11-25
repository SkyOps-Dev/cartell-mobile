// Port of frontend/lib/services/encryption.dart (spec 17 §3): the hub's encrypted credential
// fields. AES-128-CBC with no padding, a fixed key and IV, over the value's UTF-8 bytes
// zero-filled to exactly 64 bytes (four AES blocks). Flutter uses the encrypt package; this uses
// @noble/ciphers, which gives the same bytes (checked against Flutter's known-answer vector and
// against OpenSSL in the tests).

import { cbc } from '@noble/ciphers/aes.js';

import { ArgumentError } from './exceptions';
import { utf8Encode } from '../utilities/dartUtf8';

/** Each of the SSID and password gets a fixed 64-byte field in the hub's packet. */
export const hubFieldLengthBytes = 64;

// The source writes the fifth key byte as 0x023, which is 0x23.
const KEY = Uint8Array.from([
  0xda, 0xf1, 0x32, 0x74, 0x23, 0xc5, 0x33, 0xad, 0x0c, 0x25, 0x8c, 0x1b, 0x27,
  0x9d, 0x39, 0x44,
]);

const IV = Uint8Array.from([
  0x22, 0x64, 0xa2, 0x33, 0x54, 0x73, 0xa3, 0xbc, 0xb2, 0xa2, 0x34, 0x21, 0x12,
  0x54, 0x42, 0x99,
]);

export const Encryption = {
  /**
   * How many UTF-8 bytes `value` leaves unused in one hub field; negative when it does not fit.
   * The password screen uses it to refuse an over-long password as it is typed.
   */
  fieldBytesRemaining(value: string): number {
    return hubFieldLengthBytes - utf8Encode(value).length;
  },

  /**
   * Encrypts `data` into the 64-byte field the hub expects. Throws ArgumentError when it does
   * not fit. The message gives the byte count and never the value, which is a Wi-Fi password.
   */
  encryptDataBytes({ data }: { data: string }): Uint8Array {
    const bytes = utf8Encode(data);
    if (bytes.length > hubFieldLengthBytes) {
      throw new ArgumentError(
        `value is ${bytes.length} UTF-8 bytes; the hub field holds at most ` +
          `${hubFieldLengthBytes} bytes (characters outside ASCII take more ` +
          'than one byte each)',
      );
    }
    // Zero-filled: the \x00 padding the hub expects.
    const buffer = new Uint8Array(hubFieldLengthBytes);
    buffer.set(bytes);
    return cbc(KEY, IV, { disablePadding: true }).encrypt(buffer);
  },
};
