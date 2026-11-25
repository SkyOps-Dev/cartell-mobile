// hub_wifi.dart and connection_constants.dart: the join the pairing flow asks for, and the
// skipWifiHandoff testing aid that turns every Wi-Fi call into nothing.

import { NativeModules, Platform } from 'react-native';

import {
  joinApprovalLabel,
  joinApprovalLabelFor,
  totalValidationMessages,
} from '../../../../src/screens/devices/connectHubToWifi/connectionConstants';
import { HubWifi } from '../../../../src/screens/devices/connectHubToWifi/hubWifi';

const native = NativeModules.CartellWifiIot as Record<string, jest.Mock>;

beforeEach(() => {
  Object.values(native).forEach(mock => mock.mockClear());
});

test('joins "Cartell Hub <MAC>" with family12, WPA, join-once', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await HubWifi.joinHubNetwork('48:27:e2:b1:94:44');
  expect(native.connect).toHaveBeenCalledWith(
    'Cartell Hub 48:27:e2:b1:94:44',
    'family12',
    'WPA',
    true,
    30,
  );
});

test('the join answer is not checked: a false one is not an error', async () => {
  native.connect.mockResolvedValueOnce(false);
  await expect(HubWifi.joinHubNetwork('48:27:e2:b1:94:44')).resolves.toBe(
    undefined,
  );
});

test('force, leave and the connected check go to the plugin', async () => {
  await HubWifi.forceWifiUsage(true);
  await HubWifi.forceWifiUsage(false);
  expect(native.forceWifiUsage.mock.calls).toEqual([[true], [false]]);
  await HubWifi.leaveHubNetwork();
  expect(native.disconnect).toHaveBeenCalledTimes(1);
  await expect(HubWifi.isConnected()).resolves.toBe(true);
});

test('with skipWifiHandoff, nothing reaches the plugin and isConnected is false', async () => {
  const plugin = {
    connect: jest.fn(),
    forceWifiUsage: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(async () => true),
  };
  let skipping: typeof HubWifi | undefined;
  jest.isolateModules(() => {
    jest.doMock('../../../../src/config/environment', () => ({
      skipWifiHandoff: true,
    }));
    jest.doMock('../../../../src/services/wifiIot', () => ({
      WiFiForIoTPlugin: plugin,
    }));
    skipping =
      require('../../../../src/screens/devices/connectHubToWifi/hubWifi').HubWifi;
  });

  await skipping!.joinHubNetwork('48:27:e2:b1:94:44');
  await skipping!.forceWifiUsage(true);
  await skipping!.leaveHubNetwork();
  await expect(skipping!.isConnected()).resolves.toBe(false);
  for (const mock of Object.values(plugin)) {
    expect(mock).not.toHaveBeenCalled();
  }
});

test("the approval word is the system's: Join on iOS, Connect on Android", () => {
  expect(joinApprovalLabelFor({ isIOS: true })).toBe('Join');
  expect(joinApprovalLabelFor({ isIOS: false })).toBe('Connect');
  jest.replaceProperty(Platform, 'OS', 'android');
  expect(joinApprovalLabel()).toBe('Connect');
});

test('verification sends 80 messages: 2 a second for 40 seconds', () => {
  expect(totalValidationMessages).toBe(80);
});
