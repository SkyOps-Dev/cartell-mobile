# 17 — UDP Protocol and Crypto

Plan steps: 2.1, 4.6, 4.11, 15.3, 15.4. Sources: `udp_commands/**`, `services/encryption.dart`,
`services/hash_mac_address.dart`. Cross-check against `backend/hubload/udp_protocol.py`, which
mirrors the app's AES key and IV.

## 1. Transport (`udp_commands/udp_connection.dart`)

- A singleton `UDPConnection` (Subject/Observer).
- `getInstance()`:
  - Returns the existing instance if there is one.
  - Otherwise creates one and awaits its bind: wait 1 s, then
    `RawDatagramSocket.bind(anyIPv4, hubReplyPort)`, enable read and write events, listen.
  - On error: if the singleton is still this one, null it, then rethrow.
  - On success: if `clearConnection()` ran during the bind, close the socket and throw
    `StateError('The UDP connection was closed while it was opening')`.
- `clearConnection()`: null the singleton **first**, then close (any error swallowed).
- `parsePacket`: `socket.receive()`. A null datagram logs "Null packet recieved.". Otherwise
  `AbstractUdpCommand.get(bytes)` → `update(listeners)`. `update` iterates over a **copy** of the
  listener list; a listener's `Exception` goes to Sentry and the loop continues.
- `send(packet)`: `socket.send(bytes, hubDestination, hubPort)`. `hubDestination` is the IPv4
  parse of `hubAddress`; a non-IPv4 address throws `SocketException("hubAddress '<x>' is not an
  IPv4 address")`.
- The source address of replies is **not** checked.

## 2. Packet format

| Offset | Size | Field |
|---|---|---|
| 0–3 | 4 | sync bytes `DE AD BE EF` |
| 4–7 | uint32 LE | message type (hex string such as `000A0001`) |
| 8–11 | uint32 LE | message length (whole packet, in bytes) |
| 12 … len−5 | | payload |
| len−4 … len−1 | uint32 LE | checksum = sum of bytes `[0 .. len−5]` |

- Parsing does not reject a bad checksum; it stores 0 instead. An unknown type parses as a plain
  `AbstractUdpCommand`.
- Plaintext string fields are fixed-width, zero-filled UTF-8, decoded **up to the first NUL**
  with malformed bytes allowed. Ciphertext fields are decoded raw.
- `packetToHexString()` concatenates each byte's hex **without** zero padding (for logs only).

| Type | Name | Length | Payload |
|---|---|---|---|
| `000A0001` | GetFWVersion | 16 | none |
| `000B0002` | GetFWVersionReply | 20 | `version` uint32 at 12 |
| `000A00C4` | ScanWifiNetworks | 16 | none |
| `000B00C5` | ScanWifiNetworksReply | 108 | `success` u32@12, `resultNumber` u32@16, `totalNumberOfResults` u32@20, `bssid` bytes@24–29, `ssid` @30–62 (33 bytes, NUL-terminated), `primaryChannel` u8@63, `secondaryChannel` u32@64, `rssi` int8@68, `otherWifiData` @69–103 |
| `000A0003` | ResetDevice | 16 | (unused) |
| `000A00C7` | QueryWifiTestResult | 16 | (unused) |
| `000B00C8` | QueryWifiTestResultReply | 20 | `result` u32@12 (0 not started, 1 in progress, 2 success, 3 failed) |
| `000A00C9` | SaveSSIDandPassword | 144 | plaintext SSID @12–75, password @76–139 |
| `000B00CA` | SaveSSIDandPasswordReply | 20 | `result` u32@12 |
| `000A00C6` | TestSSIDandPassword | 144 | plaintext (unused) |
| `000A0101` | CheckandSaveSSIDandPassword | 144 | plaintext (unused; **not** registered in routing) |
| `000A0123` | CheckandSaveEncryptedSSIDandPassword | 144 | AES SSID @12–75, AES password @76–139 |
| `000B0124` | CheckandSaveEncryptedSSIDandPasswordReply | 20 | `result` u32@12 (an ack only, never a verdict) |
| `000A00E2` | SaveWebsocketUri | 144 | URI @12–139 (≤128 bytes); default `"<baseUrlWs>/hub/"` |
| `000A00E0` | ReadWebsocketUri | 16 | none |
| `000B00E1` | ReadWebsocketUriReply | 144 | URI @12–139 |

String writing (`setDataFromString`) copies at most `maxNumChar` bytes within `[start, end)`, so
longer values are silently truncated.

## 3. Credential encryption (`services/encryption.dart`)

- AES-128-CBC, **no padding**. Fixed key and IV, byte for byte:
  - key `da f1 32 74 23 c5 33 ad 0c 25 8c 1b 27 9d 39 44`
  - IV `22 64 a2 33 54 73 a3 bc b2 a2 34 21 12 54 42 99`
  - In the source the fifth key byte is written `0x023`, which equals `0x23`.
- Plaintext = the UTF-8 bytes of the value, zero-padded to **64 bytes**. More than 64 bytes →
  `ArgumentError('value is <n> UTF-8 bytes; the hub field holds at most 64 bytes (characters
  outside ASCII take more than one byte each)')`. The message never contains the value.
- Output is always 64 bytes.
- `fieldBytesRemaining(v) = 64 − utf8Length(v)`. The password screen uses it to block over-long
  passwords as you type.
- **Known-answer vector**: `encryptDataBytes('MyWifiPass123')` =
  `28d35f4e3bcbc12410594a2f1396467005632bde9ad2134fb819afa6ab78ac03` +
  `3b7e03543ff70f4fd83e648951edef813cb19707997c8471d2b2011a4a3a8346`.
- More test cases in `frontend/test/services/encryption_test.dart`: an empty string, 'é', 'café'
  ≠ 'cafe', '🔒', 64 × 'a' fits, 32 × 'é' fits, 63 × 'a' + 'é' is rejected with "65 UTF-8 bytes".

## 4. MAC hashing (`services/hash_mac_address.dart`)

`hashMacAddress(mac) = hex(HMAC-SHA256(key: utf8(macAddressHashKey), data: utf8(mac)))`, lower
case. The caller lower-cases the MAC first (`AA:BB:…` → `aa:bb:…`). The hash is what
`POST /locations/{id}/devices/` receives as `mac_address`.

## 5. Port and test plan

1. Pure TS packet builder and parser with tests. Compare byte for byte against
   `backend/hubload/udp_protocol.py` (generate fixtures in Python, assert in Jest).
2. AES and HMAC with the known-answer vector, plus a fixture from `hubload` with the same key.
3. Native UDP (react-native-udp or similar) wrapped to reproduce the singleton semantics in §1,
   including the clear-during-bind race.
4. Port `test/udp_commands/*` (SSID padding, singleton, connection destination and listener
   removal) and `test/services/encryption_test.dart`.
