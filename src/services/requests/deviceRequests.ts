// Port of fetchDevices and queryHubHealth from frontend/lib/services/requests/device_requests.dart
// (spec 04 §5).
//
// The hub list is returned as the server's JSON objects.
// PORT-GAP: the Device model, its parsing rules and the shared cache (spec 05).

import { baseUrlHttp, nodeBaseUrlHttp } from '../../config/environment';
import { NoHubInformationAvailableException } from '../exceptions';
import { reportError } from '../reportError';
import { AuthRequestManager } from './authRequests';
import { NetworkHelper } from './networkHelper';

export type RawDevice = Record<string, unknown>;

/** auth() → GET /devices/ → 200: the hubs, else befba. */
export async function fetchDevices(): Promise<RawDevice[]> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    throw new Error('Failed to fetch devices');
  }
  const response = await new NetworkHelper(
    // On the Node backend since 2026-10-27.
    `${nodeBaseUrlHttp()}/devices/`,
  ).getSecureData();
  if (response.statusCode === 200) {
    return JSON.parse(response.body) as RawDevice[];
  }
  reportError(new NoHubInformationAvailableException('Error Code befba:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}

/**
 * auth() → POST /devices/{id}/message/get_health/ with an empty body. The server messages the
 * hub over its live connection so it reports in; nothing comes back. A status of 300 or more is
 * reported (70a42) and otherwise ignored.
 */
export async function queryHubHealth(deviceId: number): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    throw new Error('An error occurred, please try again.');
  }
  const response = await new NetworkHelper(
    `${baseUrlHttp()}/devices/${deviceId}/message/get_health/`,
  ).postSecureData({ body: {} });
  if (response.statusCode >= 300) {
    reportError(new NoHubInformationAvailableException('Error Code 70a42:'));
  }
}
