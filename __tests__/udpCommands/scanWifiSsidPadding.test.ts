// Ported from frontend/test/udp_commands/scan_wifi_ssid_padding_test.dart: a scanned SSID
// arrives without its zero fill (#488).

import { ScanWifiNetworksReply } from '../../src/udpCommands/commands';

/** A real scan reply frame with `ssid` in its 33-byte slot, round-tripped through the wire. */
function replyFor(ssid: string): ScanWifiNetworksReply {
  const generated = ScanWifiNetworksReply.generate({
    success: 1,
    resultNumber: 0,
    totalNumberOfResults: 1,
    bssid: [0, 0, 0, 0, 0, 0],
    ssid,
    primaryChannel: 6,
    secondaryChannel: 0,
    rssi: -57,
    otherWifiData: '',
  });
  const bytes = new Uint8Array(
    generated.data.buffer,
    generated.data.byteOffset,
    generated.data.byteLength,
  ).slice();
  return ScanWifiNetworksReply.parse(new DataView(bytes.buffer));
}

describe('a scanned SSID arrives without its padding (#488)', () => {
  test('a short name does not carry the zero-fill', () => {
    const ssid = replyFor('surveillance_van4').ssid;
    expect(ssid).toBe('surveillance_van4');
    expect(ssid).toHaveLength('surveillance_van4'.length);
  });

  test('a name that fills the whole field is not swallowed', () => {
    const full = 'abcdefghijklmnopqrstuvwxyz0123456';
    expect(full).toHaveLength(33);
    expect(replyFor(full).ssid).toBe(full);
  });

  test('an empty field decodes to an empty name, not to junk', () => {
    expect(replyFor('').ssid).toBe('');
  });
});
