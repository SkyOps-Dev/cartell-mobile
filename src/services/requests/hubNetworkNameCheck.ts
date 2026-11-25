// Port of frontend/lib/services/requests/hub_network_name_check.dart (spec 04 §1): refuse server
// requests while the phone is on a hub's own Wi-Fi ("Cartell Hub <MAC>").
//
// The name comes from the app's NetworkInfo (network_info_plus's getWifiName). Without location
// permission Android answers "<unknown ssid>" and iOS nothing, and an unknown name always passes,
// as in Flutter.

import { NetworkInfo } from '../networkInfo';
import {
  OnHUBNetworkException,
  UnableToGetWifiInfoException,
} from '../exceptions';
import { reportError } from '../reportError';
import { ModeWatcherHelper } from '../../utilities/modeWatcher';

const HUB_NETWORK = /Cartell Hub ([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;

/**
 * How loudly to report that the phone is on a hub's network. While pairing it is expected for the
 * first seconds of every attempt, and the registration poll has no deadline, so only a breadcrumb.
 * Outside pairing it is a real fault with no other report.
 */
export function shouldCaptureHubNetworkEvent({
  isPairingDevices,
}: {
  isPairingDevices: boolean;
}): boolean {
  return !isPairingDevices;
}

let isCheckNameDeactivated = false;

/** Reads the current Wi-Fi name with surrounding quotes removed, or null if unknown. */
async function getNetworkInfo(): Promise<string | null> {
  try {
    let wifiName = await NetworkInfo.getWifiName();
    if (
      wifiName !== null &&
      wifiName.startsWith('"') &&
      wifiName.endsWith('"')
    ) {
      wifiName = wifiName.substring(1, wifiName.length - 1);
    }
    return wifiName;
  } catch {
    reportError(new UnableToGetWifiInfoException('Error Code cbf7f:'));
    return null;
  }
}

export const NetworkNameCheck = {
  deactivate() {
    isCheckNameDeactivated = true;
  },

  getNetworkInfo,

  async checkName(): Promise<void> {
    const wifiName = await getNetworkInfo();
    if (wifiName === null || !HUB_NETWORK.test(wifiName)) {
      return;
    }
    if (!isCheckNameDeactivated) {
      if (
        shouldCaptureHubNetworkEvent({
          isPairingDevices: ModeWatcherHelper.isPairingDevices,
        })
      ) {
        reportError(new OnHUBNetworkException());
      }
      // PORT-GAP: otherwise (while pairing) a Sentry breadcrumb, category 'pairing', 'phone still
      // on hub network', level info.
      throw new OnHUBNetworkException();
    }
  },
};
