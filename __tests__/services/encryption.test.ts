// Ported from frontend/test/services/encryption_test.dart, with the first group of
// frontend/test/screens/devices/connect_hub_to_wifi/password_length_test.dart
// (Encryption.fieldBytesRemaining; the password field's group is ported with that screen), plus a
// cross-check of every case against OpenSSL.

import { createCipheriv } from 'crypto';

import { Encryption } from '../../src/services/encryption';
import { ArgumentError } from '../../src/services/exceptions';

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

function openssl(value: string): string {
  const padded = Buffer.alloc(64);
  Buffer.from(value, 'utf8').copy(padded);
  const cipher = createCipheriv(
    'aes-128-cbc',
    Buffer.from('daf1327423c533ad0c258c1b279d3944', 'hex'),
    Buffer.from('2264a2335473a3bcb2a2342112544299', 'hex'),
  );
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString('hex');
}

const accepted = [
  '',
  'a',
  'MyWifiPass123',
  'é', // 1 UTF-16 code unit, 2 UTF-8 bytes
  'café-wifi', // mixed
  '🔒', // 2 UTF-16 code units, 4 UTF-8 bytes
  'a'.repeat(64), // the longest ASCII value that fits
  'é'.repeat(32), // 32 code units, 64 bytes: fits exactly
];

describe('Encryption.encryptDataBytes', () => {
  test('an ASCII value encrypts to the same bytes it always has', () => {
    expect(toHex(Encryption.encryptDataBytes({ data: 'MyWifiPass123' }))).toBe(
      '28d35f4e3bcbc12410594a2f1396467005632bde9ad2134fb819afa6ab78ac03' +
        '3b7e03543ff70f4fd83e648951edef813cb19707997c8471d2b2011a4a3a8346',
    );
  });

  test('every accepted input produces exactly 64 bytes', () => {
    for (const value of accepted) {
      expect(Encryption.encryptDataBytes({ data: value })).toHaveLength(64);
    }
  });

  test('every accepted input matches OpenSSL AES-128-CBC with no padding', () => {
    for (const value of accepted) {
      expect(toHex(Encryption.encryptDataBytes({ data: value }))).toBe(
        openssl(value),
      );
    }
  });

  test('a non-ASCII value no longer throws, and is not silently mangled', () => {
    const accented = Encryption.encryptDataBytes({ data: 'café' });
    const plain = Encryption.encryptDataBytes({ data: 'cafe' });
    expect(accented).toHaveLength(64);
    expect(toHex(accented)).not.toBe(toHex(plain));
  });

  test('the limit is 64 bytes, not 64 characters', () => {
    const tooLong = `${'a'.repeat(63)}é`;
    expect(tooLong).toHaveLength(64);
    expect(Buffer.byteLength(tooLong, 'utf8')).toBe(65);
    expect(() => Encryption.encryptDataBytes({ data: tooLong })).toThrow(
      ArgumentError,
    );
    expect(() => Encryption.encryptDataBytes({ data: tooLong })).toThrow(
      '65 UTF-8 bytes',
    );
  });

  test('the rejected value never appears in the exception', () => {
    const secret =
      'SuperSecretWifiPassword-far-too-long-to-fit-the-64-byte-hub-field-xyz';
    expect(Buffer.byteLength(secret, 'utf8')).toBeGreaterThan(64);
    let thrown: unknown;
    try {
      Encryption.encryptDataBytes({ data: secret });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ArgumentError);
    expect(String(thrown)).not.toContain('SuperSecret');
    expect(String(thrown)).toBe(
      'Invalid argument(s): value is 69 UTF-8 bytes; the hub field holds at most 64 ' +
        'bytes (characters outside ASCII take more than one byte each)',
    );
  });

  test('a value longer than 64 bytes is rejected rather than encrypted', () => {
    expect(() => Encryption.encryptDataBytes({ data: 'a'.repeat(70) })).toThrow(
      '70 UTF-8 bytes',
    );
  });
});

describe('Encryption.fieldBytesRemaining', () => {
  test('measures bytes, not characters', () => {
    expect(Encryption.fieldBytesRemaining('é'.repeat(32))).toBe(0);
    expect(Encryption.fieldBytesRemaining('é'.repeat(33))).toBeLessThan(0);
  });

  test('an ASCII password at the field length fits exactly', () => {
    expect(Encryption.fieldBytesRemaining('a'.repeat(64))).toBe(0);
    expect(Encryption.fieldBytesRemaining('a'.repeat(65))).toBe(-1);
  });

  test('agrees with what encryptDataBytes will accept', () => {
    const realistic = 'correct horse battery staple';
    expect(Encryption.fieldBytesRemaining(realistic)).toBeGreaterThan(0);
    expect(() =>
      Encryption.encryptDataBytes({ data: realistic }),
    ).not.toThrow();

    const overlong = 'é'.repeat(33);
    expect(Encryption.fieldBytesRemaining(overlong)).toBeLessThan(0);
    expect(() => Encryption.encryptDataBytes({ data: overlong })).toThrow(
      ArgumentError,
    );
  });
});
