// Port of network_info_plus 6.1.4's NetworkInfo().getWifiName(), over the app's own
// CartellNetworkInfo module (NetworkInfoModule.kt / .m). Android answers the SSID in double quotes,
// or "<unknown ssid>" without location permission; iOS answers the plain SSID or null.

import { NativeModules } from 'react-native';

type NetworkInfoNative = {
  getWifiName(): Promise<string | null>;
};

export const NetworkInfo = {
  async getWifiName(): Promise<string | null> {
    const module = NativeModules.CartellNetworkInfo as
      | NetworkInfoNative
      | undefined;
    if (!module) {
      throw new Error('CartellNetworkInfo is not linked');
    }
    return module.getWifiName();
  },
};
