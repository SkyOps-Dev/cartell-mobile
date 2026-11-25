// The Dart side of wifi_iot 0.3.19+2 (lib/wifi_iot.dart), as src/services/wifiIot.ts ports it:
// what each call asks the native module, and what it answers.

import { NativeModules, Platform } from 'react-native';

import { WiFiForIoTPlugin } from '../../src/services/wifiIot';

const native = NativeModules.CartellWifiIot as Record<string, jest.Mock>;

beforeEach(() => {
  Object.values(native).forEach(mock => mock.mockClear());
});

describe('connect', () => {
  test('joins with the arguments given, join-once and a 30-second limit by default', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await expect(
      WiFiForIoTPlugin.connect('Cartell Hub 48:27:e2:b1:94:44', {
        password: 'family12',
        security: 'WPA',
      }),
    ).resolves.toBe(true);
    expect(native.connect).toHaveBeenCalledWith(
      'Cartell Hub 48:27:e2:b1:94:44',
      'family12',
      'WPA',
      true,
      30,
    );
  });

  test('an SSID of 0 or more than 32 characters is refused without asking the system', async () => {
    await expect(WiFiForIoTPlugin.connect('')).resolves.toBe(false);
    await expect(WiFiForIoTPlugin.connect('x'.repeat(33))).resolves.toBe(false);
    expect(native.connect).not.toHaveBeenCalled();
    expect(native.isEnabled).not.toHaveBeenCalled();
  });

  test('on Android, Wi-Fi switched off is first switched on', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    native.isEnabled.mockResolvedValueOnce(false);
    await WiFiForIoTPlugin.connect('Home');
    expect(native.setEnabled).toHaveBeenCalledWith(true, false);
    expect(native.setEnabled.mock.invocationCallOrder[0]).toBeLessThan(
      native.connect.mock.invocationCallOrder[0],
    );
  });

  test('on Android with Wi-Fi on, and always on iOS, it is not', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await WiFiForIoTPlugin.connect('Home');
    jest.replaceProperty(Platform, 'OS', 'ios');
    await WiFiForIoTPlugin.connect('Home');
    expect(native.setEnabled).not.toHaveBeenCalled();
    // iOS does not even ask.
    expect(native.isEnabled).toHaveBeenCalledTimes(1);
  });

  test('a native nil answers false', async () => {
    native.connect.mockResolvedValueOnce(null);
    await expect(WiFiForIoTPlugin.connect('Home')).resolves.toBe(false);
  });

  test('an error the native side reports reaches the caller, as a PlatformException does', async () => {
    native.connect.mockRejectedValueOnce(new Error('WEP is not supported'));
    await expect(WiFiForIoTPlugin.connect('Home')).rejects.toThrow(
      'WEP is not supported',
    );
  });
});

describe('the other calls', () => {
  test('isEnabled reads a native nil as false (iOS with no network)', async () => {
    native.isEnabled.mockResolvedValueOnce(null);
    await expect(WiFiForIoTPlugin.isEnabled()).resolves.toBe(false);
    await expect(WiFiForIoTPlugin.isEnabled()).resolves.toBe(true);
  });

  test('forceWifiUsage, isConnected and disconnect pass the native answer, nil as false', async () => {
    await expect(WiFiForIoTPlugin.forceWifiUsage(true)).resolves.toBe(true);
    expect(native.forceWifiUsage).toHaveBeenCalledWith(true);
    native.forceWifiUsage.mockResolvedValueOnce(null);
    await expect(WiFiForIoTPlugin.forceWifiUsage(false)).resolves.toBe(false);

    native.isConnected.mockResolvedValueOnce(false);
    await expect(WiFiForIoTPlugin.isConnected()).resolves.toBe(false);
    native.disconnect.mockResolvedValueOnce(null);
    await expect(WiFiForIoTPlugin.disconnect()).resolves.toBe(false);
  });

  test('a missing module answers false, as Dart does for MissingPluginException', async () => {
    const linked = NativeModules.CartellWifiIot;
    NativeModules.CartellWifiIot = undefined;
    try {
      await expect(WiFiForIoTPlugin.connect('Home')).resolves.toBe(false);
      await expect(WiFiForIoTPlugin.isConnected()).resolves.toBe(false);
      await expect(WiFiForIoTPlugin.disconnect()).resolves.toBe(false);
    } finally {
      NativeModules.CartellWifiIot = linked;
    }
  });
});
