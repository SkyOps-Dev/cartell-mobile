// Port of the Dart side of wifi_iot 0.3.19+2 (lib/wifi_iot.dart, WiFiForIoTPlugin) for the calls hub
// pairing makes, over the app's own CartellWifiIot module (WifiIotModule.kt / .m).
//
// As in Dart, only a missing plugin is caught: the call then answers false. An error the native side
// reports is thrown to the caller. Each call answers as the plugin's Dart side does, so a native nil
// (iOS isEnabled with no network) reads as false.

import { NativeModules, Platform } from 'react-native';

export type NetworkSecurity = 'WPA' | 'WEP' | 'NONE';

type WifiIotNative = {
  isEnabled(): Promise<boolean | null>;
  setEnabled(state: boolean, shouldOpenSettings: boolean): Promise<null>;
  connect(
    ssid: string,
    password: string | null,
    security: NetworkSecurity,
    joinOnce: boolean,
    timeoutInSeconds: number,
  ): Promise<boolean | null>;
  forceWifiUsage(useWifi: boolean): Promise<boolean | null>;
  isConnected(): Promise<boolean | null>;
  disconnect(): Promise<boolean | null>;
};

/** NativeModules.CartellWifiIot, or undefined (Dart's MissingPluginException). */
function native(): WifiIotNative | undefined {
  return NativeModules.CartellWifiIot as WifiIotNative | undefined;
}

export const WiFiForIoTPlugin = {
  /** Routes the app's traffic over the joined Wi-Fi network (Android), or stops (false). */
  async forceWifiUsage(useWifi: boolean): Promise<boolean> {
    return (await native()?.forceWifiUsage(useWifi)) ?? false;
  },

  async isEnabled(): Promise<boolean> {
    return (await native()?.isEnabled()) === true;
  },

  /** Switches Wi-Fi on or off. From Android 10 the system no longer lets an app do it. */
  async setEnabled(
    state: boolean,
    { shouldOpenSettings = false }: { shouldOpenSettings?: boolean } = {},
  ): Promise<void> {
    await native()?.setEnabled(state, shouldOpenSettings);
  },

  /**
   * Joins the network, local-only (the plugin's withInternet false, the only way the app calls
   * it). An SSID of 0 or more than 32 characters answers false without asking the system. On
   * Android, Wi-Fi switched off is first switched on, where the system still allows it.
   */
  async connect(
    ssid: string,
    {
      password,
      security = 'NONE',
      joinOnce = true,
      timeoutInSeconds = 30,
    }: {
      password?: string;
      security?: NetworkSecurity;
      joinOnce?: boolean;
      timeoutInSeconds?: number;
    } = {},
  ): Promise<boolean> {
    if (ssid.length === 0 || ssid.length > 32) {
      return false;
    }
    if (Platform.OS !== 'ios' && !(await WiFiForIoTPlugin.isEnabled())) {
      await WiFiForIoTPlugin.setEnabled(true);
    }
    return (
      (await native()?.connect(
        ssid,
        password ?? null,
        security,
        joinOnce,
        timeoutInSeconds,
      )) ?? false
    );
  },

  /** Whether the phone holds any Wi-Fi connection, internet or not. */
  async isConnected(): Promise<boolean> {
    return (await native()?.isConnected()) ?? false;
  },

  /** Leaves the joined network; true if there was one to leave. */
  async disconnect(): Promise<boolean> {
    return (await native()?.disconnect()) ?? false;
  },
};
