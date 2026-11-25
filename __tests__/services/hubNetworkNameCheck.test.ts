// Ported from frontend/test/services/requests/hub_network_name_check_test.dart
// (shouldCaptureHubNetworkEvent), plus NetworkNameCheck reading the Wi-Fi name, which RN can do
// since hub pairing brought the native module.

import { NativeModules } from 'react-native';

import {
  OnHUBNetworkException,
  UnableToGetWifiInfoException,
} from '../../src/services/exceptions';
import * as errorReporter from '../../src/services/reportError';
import {
  NetworkNameCheck,
  shouldCaptureHubNetworkEvent,
} from '../../src/services/requests/hubNetworkNameCheck';
import { ModeWatcherHelper } from '../../src/utilities/modeWatcher';

const getWifiName = NativeModules.CartellNetworkInfo.getWifiName as jest.Mock;
let report: jest.SpyInstance;

beforeEach(() => {
  report = jest.spyOn(errorReporter, 'reportError');
  ModeWatcherHelper.isPairingDevices = false;
});

afterEach(() => {
  report.mockRestore();
  getWifiName.mockReset();
  getWifiName.mockResolvedValue(null);
  ModeWatcherHelper.isPairingDevices = false;
});

describe('shouldCaptureHubNetworkEvent', () => {
  test('while pairing: breadcrumb only, no event', () => {
    expect(shouldCaptureHubNetworkEvent({ isPairingDevices: true })).toBe(
      false,
    );
  });

  test('outside pairing: capture a real event', () => {
    expect(shouldCaptureHubNetworkEvent({ isPairingDevices: false })).toBe(
      true,
    );
  });
});

describe('NetworkNameCheck', () => {
  test("Android's quotes are removed from the name", async () => {
    getWifiName.mockResolvedValueOnce('"Home Wifi"');
    await expect(NetworkNameCheck.getNetworkInfo()).resolves.toBe('Home Wifi');
    getWifiName.mockResolvedValueOnce('Home Wifi');
    await expect(NetworkNameCheck.getNetworkInfo()).resolves.toBe('Home Wifi');
  });

  test('an unknown name, or any other network, passes', async () => {
    for (const name of [null, '<unknown ssid>', '"Home Wifi"', 'Cartell Hub']) {
      getWifiName.mockResolvedValueOnce(name);
      await expect(NetworkNameCheck.checkName()).resolves.toBeUndefined();
    }
    expect(report).not.toHaveBeenCalled();
  });

  test("on a hub's network outside pairing: reported, then refused", async () => {
    getWifiName.mockResolvedValueOnce('"Cartell Hub 48:27:E2:B1:94:44"');
    await expect(NetworkNameCheck.checkName()).rejects.toBeInstanceOf(
      OnHUBNetworkException,
    );
    expect(report).toHaveBeenCalledWith(expect.any(OnHUBNetworkException));
  });

  test("on a hub's network while pairing: refused, not reported", async () => {
    ModeWatcherHelper.isPairingDevices = true;
    getWifiName.mockResolvedValueOnce('Cartell Hub 48-27-e2-b1-94-44');
    await expect(NetworkNameCheck.checkName()).rejects.toBeInstanceOf(
      OnHUBNetworkException,
    );
    expect(report).not.toHaveBeenCalled();
  });

  test('a failed read is reported as cbf7f and reads as unknown', async () => {
    getWifiName.mockRejectedValueOnce(new Error('no module'));
    await expect(NetworkNameCheck.checkName()).resolves.toBeUndefined();
    expect(report).toHaveBeenCalledWith(
      new UnableToGetWifiInfoException('Error Code cbf7f:'),
    );
  });
});
