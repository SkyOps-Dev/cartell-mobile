// Port of frontend/lib/services/auth_manager/check_creds.dart (spec 04 §7, spec 08 §3): what a
// fresh login stores, and the sign-in check auto-login repeats up to three times.
// LATER(part 14): the push-token helpers (sendFCMToken, validateToken, validateFCMToken,
// getFCMToken).

import { SecureStorage } from '../secureStorage';
import type { HttpResponse } from '../requests/networkHelper';
import { AuthRequestManager } from '../requests/authRequests';
import { fetchDevices, queryHubHealth } from '../requests/deviceRequests';
import { setUser } from '../requests/userRequests';
import { Result } from '../result';

/** Stores the access and refresh tokens from a login response, then purges legacy keys. */
export async function successfulLoginStartup(
  data: HttpResponse,
): Promise<void> {
  const response = JSON.parse(data.body);
  await SecureStorage.setAccessToken(response.access);
  await SecureStorage.setRefreshToken(response.refresh);
  await SecureStorage.purgeLegacyCredentials();
}

/** GET /devices/, then get_health for every connected hub, one after another. */
export async function queryAllHubsHealth(): Promise<void> {
  const devices = await fetchDevices();
  for (const element of devices) {
    // LATER(part 24): read these through the Device model (device.isConnected, id), whose
    // parser throws on a malformed hub.
    const meta = element.device as { is_connected?: unknown } | undefined;
    if (meta?.is_connected === true) {
      await queryHubHealth(element.id as number);
    }
  }
}

/** One sign-in attempt: session check, push token, hub health, the user. */
export async function autoLoginMethodOnTheLoadScreen(): Promise<Result> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    return Result.failure({ message: 'Failed to authenticate' });
  }
  // LATER(part 14): NotificationApi.init() (not awaited), then await validateFCMToken().
  await queryAllHubsHealth();
  await setUser();
  return Result.success();
}
