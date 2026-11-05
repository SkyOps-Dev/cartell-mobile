// Port of frontend/lib/services/hash_mac_address.dart: HMAC-SHA256 of the MAC address (UTF-8)
// keyed with the environment's macAddressHashKey (UTF-8), as lowercase hex. The server stores the
// same hash for every hub, so this is what registration sends instead of the MAC itself.

import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { macAddressHashKey } from '../config/environment';

export function hashMacAddress(mac: string, key = macAddressHashKey): string {
  return bytesToHex(hmac(sha256, utf8ToBytes(key), utf8ToBytes(mac)));
}
