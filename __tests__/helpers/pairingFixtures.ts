// Ported from frontend/test/support/pairing_fixtures.dart (testDevice, testWifiNetwork): a hub and
// a scan result for the pairing wizard's tests. (wrapPairingScreen comes with the screens.)

import { Device, parseDevice } from '../../src/models/device';
import { ScanWifiNetworksReply } from '../../src/udpCommands/commands';
import { hubJson } from './hubJson';

let nextId = 9100;

/** A hub no other test has cached (the Device parser merges into its cache by id). */
export function testDevice({
  macAddress = '48:27:e2:b1:94:44',
  isConnected = true,
}: { macAddress?: string; isConnected?: boolean } = {}): Device {
  return parseDevice(
    hubJson({
      id: nextId++,
      device: { mac_address: macAddress, is_connected: isConnected },
    }),
  );
}

/** A scan result, built with generate so no byte buffer is needed. */
export function testWifiNetwork({
  ssid = 'surveillance_van4',
  rssi = -57,
}: { ssid?: string; rssi?: number } = {}): ScanWifiNetworksReply {
  return ScanWifiNetworksReply.generate({
    success: 1,
    resultNumber: 0,
    totalNumberOfResults: 1,
    bssid: [0, 0, 0, 0, 0, 0],
    ssid,
    primaryChannel: 6,
    secondaryChannel: 0,
    rssi,
    otherWifiData: '',
  });
}
