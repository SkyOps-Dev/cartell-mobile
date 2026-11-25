// Port of frontend/lib/screens/devices/connect_hub_to_wifi/hub_wifi.dart: the Wi-Fi hop, in one
// place so local testing can skip it.
//
// With skipWifiHandoff set (`npm run env:simulator`), every call does nothing and the rest of
// pairing runs unchanged against hubAddress (a simulated hub on the dev machine). A testing aid,
// not a product mode: it skips exactly the step where pairing fails in practice.

import { skipWifiHandoff } from '../../../config/environment';
import { WiFiForIoTPlugin } from '../../../services/wifiIot';
import { hubSsidPrefix, hubWifiPassword } from './connectionConstants';

export const HubWifi = {
  /**
   * Joins the hub's own network, join-once and local-only. The answer is not checked: the
   * plugin sometimes reports false for a join that worked.
   */
  async joinHubNetwork(macAddress: string): Promise<void> {
    if (skipWifiHandoff) {
      return;
    }
    await WiFiForIoTPlugin.connect(`${hubSsidPrefix}${macAddress}`, {
      password: hubWifiPassword,
      security: 'WPA',
      joinOnce: true,
    });
  },

  /** Routes traffic over Wi-Fi rather than mobile data while on the hub's network. */
  async forceWifiUsage(use: boolean): Promise<void> {
    if (skipWifiHandoff) {
      return;
    }
    await WiFiForIoTPlugin.forceWifiUsage(use);
  },

  /** Leaves the hub's network, so the phone rejoins its own. */
  async leaveHubNetwork(): Promise<void> {
    if (skipWifiHandoff) {
      return;
    }
    await WiFiForIoTPlugin.disconnect();
  },

  /** Whether the phone holds a Wi-Fi connection; false when skipping (nothing to leave). */
  async isConnected(): Promise<boolean> {
    if (skipWifiHandoff) {
      return false;
    }
    return WiFiForIoTPlugin.isConnected();
  },
};
