// Port of fetchDevices, setDevice, addDevice, deleteDevice, updateDeviceData, the hub-settings
// switches, queryHubHealth, pairToIntegrator, triggerIntegrator, and for the sensor screens
// pairToSounder, isDeviceConnectedRequest and setPairingModeRequest, and for the firmware screens
// startFwUpdateAndGetFileSize, and for hub Wi-Fi pairing probeHubRegistration, from
// frontend/lib/services/requests/device_requests.dart (spec 04 §5). Flutter sends them to Django;
// here they go to Node, which serves them since F05 (the hub messages since F07, the firmware start
// since F12). probeHubRegistration still goes to Django: the pairing wizard is built against Django
// first and moved to Node as a step of its own.

import { baseUrlHttp, nodeBaseUrlHttp } from '../../config/environment';
import { Device, parseDevice } from '../../models/device';
import type { Json } from '../../models/jsonParser';
import {
  classifyProbeFailure,
  HubCheckUnavailable,
  HubCheckUnavailableReason,
  HubNotYetRegistered,
  HubRegistered,
  HubRegistrationCheck,
} from '../../screens/devices/connectHubToWifi/hubRegistrationCheck';
import {
  FirmwareUpdateRejectedException,
  NoHubInformationAvailableException,
  UpdateTokenFailedException,
} from '../exceptions';
import { reportError } from '../reportError';
import { AuthRequestManager } from './authRequests';
import { type HttpResponse, NetworkHelper } from './networkHelper';

/**
 * Has the hub registered a live connection yet? GET /devices/{id}/ (no auth() first: the requester
 * already refreshes and retries once on a 401, and throws AuthExpiredException if that fails) →
 * a non-2xx is `server`; otherwise the body through the Device parser (merged into the cached
 * hub) → is_connected. Anything thrown becomes HubCheckUnavailable with its reason; nothing is
 * reported per check (the poll reports one summary when it ends).
 */
export async function probeHubRegistration(
  device: Device,
): Promise<HubRegistrationCheck> {
  try {
    const response = await new NetworkHelper(
      `${baseUrlHttp()}/devices/${device.id}/`,
    ).getSecureData();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      // PORT-GAP: log.w('Registration probe got HTTP ${res.statusCode}').
      return new HubCheckUnavailable(HubCheckUnavailableReason.server);
    }
    const parsed = parseDevice(JSON.parse(response.body) as Json);
    return parsed.device.isConnected
      ? new HubRegistered()
      : new HubNotYetRegistered();
  } catch (error) {
    // PORT-GAP: Sentry.addBreadcrumb(category 'pairing', 'registration probe unavailable',
    // data {reason, errorType}, level info).
    return new HubCheckUnavailable(classifyProbeFailure(error));
  }
}

/** auth() → GET /devices/ → 200: the hubs, each through the Device parser; else befba. */
export async function fetchDevices(): Promise<Device[]> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    throw new Error('Failed to fetch devices');
  }
  const response = await new NetworkHelper(
    // On the Node backend since 2026-10-27.
    `${nodeBaseUrlHttp()}/devices/`,
  ).getSecureData();
  // PORT-GAP: log.i(response.body).
  if (response.statusCode === 200) {
    return (JSON.parse(response.body) as Json[]).map(parseDevice);
  }
  reportError(new NoHubInformationAvailableException('Error Code befba:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}

/**
 * auth() (a failure throws "An error occurred, please try again.") → POST
 * /devices/{id}/message/get_health/ with an empty body (Node, which serves it since F07): the
 * server asks the hub, over its live connection, to report in. A status of 300 or more (a hub that
 * is not connected answers 400) is reported (70a42) and otherwise ignored.
 */
export async function queryHubHealth(
  deviceId: number,
  server: string = nodeBaseUrlHttp(),
): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    throw new Error('An error occurred, please try again.');
  }
  const response = await new NetworkHelper(
    `${server}/devices/${deviceId}/message/get_health/`,
  ).postSecureData({ body: {} });
  if (response.statusCode < 300) {
    // PORT-GAP: log.i(response.body); log.i('successful query').
    return;
  }
  reportError(new NoHubInformationAvailableException('Error Code 70a42:'));
  // PORT-GAP: log.i(response.statusCode); log.i('Failed to query device $d').
}

/**
 * pairToSounder, pairToIntegrator and triggerIntegrator, which differ only in the command: POST
 * /devices/{id}/message/<command>/ with an empty body (Node, since F07), with no auth() first.
 * Below 300 is success; otherwise 7466e is reported (for all three, as in Flutter) and it throws.
 */
async function sendIntegratorMessage(
  deviceId: number,
  command: 'pair_to_sounder' | 'pair_to_integrator' | 'trigger_integrator',
): Promise<void> {
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${deviceId}/message/${command}/`,
  ).postSecureData({ body: {} });
  if (response.statusCode < 300) {
    // PORT-GAP: log.i(response.body); then 'successfully updated' (pair_to_sounder) or
    // 'successfully sent pair to integrator' (the other two, the same words for both).
    return;
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new NoHubInformationAvailableException('Error Code 7466e:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}

/** Pair Integrator (Hub settings): the hub pairs with its emulated sensor. */
export const pairToIntegrator = (deviceId: number) =>
  sendIntegratorMessage(deviceId, 'pair_to_integrator');

/** Open Gate (a hub's page): the hub triggers its emulated sensor. */
export const triggerIntegrator = (deviceId: number) =>
  sendIntegratorMessage(deviceId, 'trigger_integrator');

/** Pair Sounder (the onboard sensor's page): the hub pairs with a sounder. */
export const pairToSounder = (deviceId: number) =>
  sendIntegratorMessage(deviceId, 'pair_to_sounder');

/**
 * isDeviceConnectedRequest (Add Sensor): auth() (false if it fails) → GET /devices/{id}/ (no
 * health request first) → the body through the Device parser (merged into the cached hub) → its
 * is_connected. The status is not looked at: any failure, an error body that does not parse
 * included, reports 205f8 and gives false.
 */
export async function isDeviceConnectedRequest(
  device: Device,
): Promise<boolean> {
  try {
    const status = await new AuthRequestManager().auth();
    if (status.failed) {
      return false;
    }
    const response = await new NetworkHelper(
      `${nodeBaseUrlHttp()}/devices/${device.id}/`,
    ).getSecureData();
    return parseDevice(JSON.parse(response.body) as Json).device.isConnected;
  } catch {
    reportError(new NoHubInformationAvailableException('Error Code 205f8:'));
    return false;
  }
}

/**
 * setPairingModeRequest (Add Sensor): auth() (a failure throws "An error occurred, please try
 * again.") → POST /devices/{id}/message/set_pairing_mode/ with is_enabled "True" / "False" (Node,
 * since F07). Only a status above 450 counts as failure: the body's non_field_errors is reported
 * and it throws. A 400 (hub not connected) passes as success, as in Flutter.
 */
export async function setPairingModeRequest(
  isEnabled: boolean,
  device: Device,
): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    throw new Error('An error occurred, please try again.');
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${device.id}/message/set_pairing_mode/`,
  ).postSecureData({ body: { is_enabled: isEnabled ? 'True' : 'False' } });
  if (response.statusCode > 450) {
    const error = new NoHubInformationAvailableException(
      String((JSON.parse(response.body) as Json).non_field_errors),
    );
    reportError(error);
    throw error;
  }
}

/**
 * One hub, fresh: auth() → the health request → GET /devices/{id}/ (Node, which serves it since
 * F05) → 200: the hub through the Device parser, merged into the cached one. A failed auth() is
 * reported as a54db and any other status as e412a; both throw. `server` is Node by default; the
 * pairing wizard's entry passes Django's address, as the whole wizard is on Django for now.
 */
export async function setDevice(
  deviceId: number,
  server: string = nodeBaseUrlHttp(),
): Promise<Device> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new NoHubInformationAvailableException('Error Code a54db:'));
    throw new NoHubInformationAvailableException('Failed to load data');
  }
  await queryHubHealth(deviceId, server);
  const response = await new NetworkHelper(
    `${server}/devices/${deviceId}/`,
  ).getSecureData();
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body).
    return parseDevice(JSON.parse(response.body) as Json);
  }
  reportError(new NoHubInformationAvailableException('Error Code e412a:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}

/**
 * Add Hub's registration: auth() (791fa on failure, which throws) → POST
 * /locations/{locationID}/devices/ with the body as sent (name, and the hashed MAC). The response
 * is handed back whatever its status; the caller reads it. `locationID` is put in the path as it
 * is, so a missing one is "null" (Dart's string interpolation).
 */
export async function addDevice({
  locationID,
  body,
}: {
  locationID: number | null | undefined;
  body: Record<string, string>;
}): Promise<HttpResponse> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new NoHubInformationAvailableException('Error Code 791fa:'));
    throw new NoHubInformationAvailableException('Failed to load data');
  }
  const url = `${nodeBaseUrlHttp()}/locations/${locationID ?? 'null'}/devices/`;
  // PORT-GAP: log.i(url).
  return new NetworkHelper(url).postSecureData({ body });
}

/**
 * Delete Hub: auth() → DELETE /devices/{id}/ (the server archives the registration). Below 300 is
 * success; otherwise 5486f is reported and it throws. A failed auth() is cda7f.
 */
export async function deleteDevice(id: number): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new NoHubInformationAvailableException('Error Code cda7f:'));
    // Flutter's message, typo and all.
    throw new NoHubInformationAvailableException('Failed to deleete hub');
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${id}/`,
  ).secureDelete();
  if (response.statusCode < 300) {
    // PORT-GAP: log.i(response.statusCode); log.i('Hub Deleted').
    return;
  }
  reportError(new NoHubInformationAvailableException('Error Code 5486f:'));
  throw new NoHubInformationAvailableException('Failed to delete Hub.');
}

/**
 * Rename Hub (and the hub's other text fields): auth() → PATCH /devices/{id}/ with `body`. Only 200
 * is success; otherwise 80ae9 is reported and it throws. A failed auth() is c43be.
 */
export async function updateDeviceData({
  devid,
  body,
}: {
  devid: number;
  body: Record<string, string>;
}): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new NoHubInformationAvailableException('Error Code c43be:'));
    throw new NoHubInformationAvailableException('Failed to load data');
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${devid}/`,
  ).patchSecureData({ body });
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(body); log.i('successfully updated').
    return;
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new NoHubInformationAvailableException('Error Code 80ae9:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}

/**
 * The four hub-settings switches Node serves, which differ only in the field: auth() -> PATCH
 * /devices/{id}/ with the field as "true" / "false" (Dart's toString). Only 200 is success;
 * otherwise 69f90 is reported and it throws. A failed auth() is f7061.
 */
async function patchDeviceSwitch(
  deviceId: number,
  field: string,
  shouldEnable: boolean,
): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new NoHubInformationAvailableException('Error Code f7061:'));
    throw new NoHubInformationAvailableException('Failed to load data');
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${deviceId}/`,
  ).patchSecureData({ body: { [field]: String(shouldEnable) } });
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body); log.i('successfully updated').
    return;
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new NoHubInformationAvailableException('Error Code 69f90:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}

/** Receive Hub Notifications. */
export const setDeviceNotificationPolicy = (deviceId: number, on: boolean) =>
  patchDeviceSwitch(deviceId, 'should_send_notification', on);

/** Receive Connection Notifications. */
export const setDeviceConnectionNotificationPolicy = (
  deviceId: number,
  on: boolean,
) => patchDeviceSwitch(deviceId, 'should_send_connection_notification', on);

/** Receive Email Notifications. */
export const setDeviceEmailNotificationPolicy = (
  deviceId: number,
  on: boolean,
) => patchDeviceSwitch(deviceId, 'should_send_email', on);

/** Enable Integrator Support. */
export const setDeviceIntegratorSupport = (deviceId: number, on: boolean) =>
  patchDeviceSwitch(deviceId, 'should_use_emulated_sensor', on);

/**
 * Enable Onboard Sensor: PATCH /devices/{id}/ with should_use_onboard_sensor "true" / "false". Unlike
 * the others there is no auth() first. Only 200 is success; otherwise 41ef1 is reported and it
 * throws. The server also tells a connected hub at once (Node since F07).
 */
export async function setOnboardSensor(
  deviceId: number,
  shouldEnable: boolean,
): Promise<void> {
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${deviceId}/`,
  ).patchSecureData({
    body: { should_use_onboard_sensor: String(shouldEnable) },
  });
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body); log.i('successfully updated').
    return;
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new NoHubInformationAvailableException('Error Code 41ef1:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}

/**
 * startFwUpdateAndGetFileSize (Update now, Try again): auth() (a failure throws
 * UpdateTokenFailedException, unreported) → POST /devices/{id}/message/update_firmware/ with the
 * firmware's id (Node, since F12). Below 300: the new update's `fw_update_id`. Otherwise the body
 * is decoded: a refusal in `non_field_errors` (e.g. an update already running) throws
 * FirmwareUpdateRejectedException with the server's words joined by spaces; anything else reports
 * 03337 and throws NoHubInformationAvailableException.
 */
export async function startFwUpdateAndGetFileSize({
  deviceId,
  firmwareId,
}: {
  deviceId: number;
  firmwareId: number;
}): Promise<number> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    throw new UpdateTokenFailedException('Failed to start the firmware update');
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${deviceId}/message/update_firmware/`,
  ).postSecureData({ body: { firmware: String(firmwareId) } });
  // PORT-GAP: log.i(response.body).
  const decoded: unknown = JSON.parse(response.body);
  if (response.statusCode < 300) {
    const id = (decoded as Json).fw_update_id;
    if (typeof id !== 'number') {
      // Dart returns it from a Future<int>: anything else is a type error at the await.
      throw new TypeError(`type '${typeof id}' is not a subtype of type 'int'`);
    }
    return id;
  }
  const nonFieldErrors =
    decoded !== null && typeof decoded === 'object' && !Array.isArray(decoded)
      ? (decoded as Json).non_field_errors
      : null;
  if (nonFieldErrors !== null && nonFieldErrors !== undefined) {
    // PORT-GAP: log.i(nonFieldErrors).
    throw new FirmwareUpdateRejectedException(
      Array.isArray(nonFieldErrors)
        ? nonFieldErrors.map(String).join(' ')
        : String(nonFieldErrors),
    );
  }
  reportError(new NoHubInformationAvailableException('Error Code 03337:'));
  throw new NoHubInformationAvailableException('Failed to load data');
}
