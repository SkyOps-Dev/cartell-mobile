// Port of frontend/lib/services/requests/hub_network_name_check.dart (spec 04 §1): refuse server
// requests while the phone is on a hub's own Wi-Fi ("Cartell Hub <MAC>").
//
// Part 4 foundation: reading the Wi-Fi name needs a native library and location permission,
// which arrive with hub pairing (part 30). Until then the name reads as unknown. That is also
// what the Flutter app gets on a phone that has not granted location permission (Android hides
// the SSID), and an unknown name always passes, so the signed-out screens behave the same.

import { OnHUBNetworkException } from '../exceptions';
import { reportError } from '../reportError';
import { ModeWatcherHelper } from '../../utilities/modeWatcher';

const HUB_NETWORK = /Cartell Hub ([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;

let isCheckNameDeactivated = false;

/** Reads the current Wi-Fi name with surrounding quotes removed, or null if unknown. */
async function getNetworkInfo(): Promise<string | null> {
  // LATER(part 30): read the SSID; on failure report UnableToGetWifiInfoException("Error Code cbf7f:").
  return null;
}

export const NetworkNameCheck = {
  deactivate() {
    isCheckNameDeactivated = true;
  },

  async checkName(): Promise<void> {
    const wifiName = await getNetworkInfo();
    if (wifiName === null || !HUB_NETWORK.test(wifiName)) {
      return;
    }
    if (!isCheckNameDeactivated) {
      if (!ModeWatcherHelper.isPairingDevices) {
        reportError(new OnHUBNetworkException());
      }
      // LATER(part 30): during pairing, a breadcrumb 'phone still on hub network' instead.
      throw new OnHUBNetworkException();
    }
  },
};
