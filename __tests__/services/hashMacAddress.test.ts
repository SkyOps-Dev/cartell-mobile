// hash_mac_address.dart: HMAC-SHA256 of the MAC, keyed with the environment's macAddressHashKey.
// Expected values computed with Python's hmac module.

import { hashMacAddress } from '../../src/services/hashMacAddress';

test('is HMAC-SHA256 as lowercase hex (RFC 4231 test case 2)', () => {
  expect(hashMacAddress('what do ya want for nothing?', 'Jefe')).toBe(
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  );
});

test('matches the local Node key for the fake factory hub', () => {
  expect(hashMacAddress('ff:ff:ff:fd:00:06', 'local-dev-mac-key')).toBe(
    'cb11c8d9ea22a8507ce7261e840b468a5e55e542df2f7fa39408881ab64783a8',
  );
});

test("uses the environment's key, '???' when the environment has none (Flutter's default)", () => {
  expect(hashMacAddress('ff:ff:ff:fd:00:06')).toBe(
    '25721fc28109342390d1888fa7e4640164e13f04a3e1b6b24bf00dbd1774f824',
  );
});
