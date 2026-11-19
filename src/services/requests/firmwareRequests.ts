// Port of frontend/lib/services/requests/firmware_requests.dart and
// frontend/lib/services/requests/firmware_update_requests.dart
// (spec 04 §5, spec 14): the running-update check, the two latest firmwares, and an update's
// status. Flutter sends them to Django; here they go to Node, which serves them since F12.

import { nodeBaseUrlHttp } from '../../config/environment';
import {
  Firmware,
  FirmwareUpdate,
  parseFirmware,
  parseFirmwareUpdate,
} from '../../models/firmware';
import type { Json } from '../../models/jsonParser';
import {
  ESP32UnableToGetLatestFirmware,
  RFM6601UnableToGetLatestFirmware,
  UnrecognizedFirmwareUpdate,
  UpdateTokenFailedException,
} from '../exceptions';
import { reportError } from '../reportError';
import { AuthRequestManager } from './authRequests';
import { NetworkHelper } from './networkHelper';

/** auth(); on failure 2a380 is reported and UpdateTokenFailedException thrown. */
async function authOrThrow(): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new UpdateTokenFailedException('Error Code 2a380:'));
    throw new UpdateTokenFailedException('Failed to load data');
  }
}

/** Dart's `list[0]`: an empty list throws RangeError (an empty `latest-*` list, quirk). */
function first(list: Json[]): Json {
  if (list.length === 0) {
    throw new RangeError(
      'RangeError (length): Invalid value: Valid value range is empty: 0',
    );
  }
  return list[0];
}

/**
 * checkForRunningFirmwareUpdate: GET /devices/{id}/check_existing_firmware_update/ → 200 or 202:
 * the updates still pending or running; else d7562 and it throws.
 */
export async function checkForRunningFirmwareUpdate(
  deviceId: number,
): Promise<FirmwareUpdate[]> {
  await authOrThrow();
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${deviceId}/check_existing_firmware_update/`,
  ).getSecureData();
  if (response.statusCode === 200 || response.statusCode === 202) {
    return (JSON.parse(response.body) as Json[]).map(parseFirmwareUpdate);
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new UnrecognizedFirmwareUpdate('Error Code d7562:'));
  throw new UnrecognizedFirmwareUpdate('Failed to load data');
}

/** getLatestESP32APPFirmware: GET /latest-esp32-app/ → 200: the first; else d7562, thrown. */
export async function getLatestESP32APPFirmware(): Promise<Firmware> {
  await authOrThrow();
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/latest-esp32-app/`,
  ).getSecureData();
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body).
    return parseFirmware(first(JSON.parse(response.body) as Json[]));
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new ESP32UnableToGetLatestFirmware('Error Code d7562:'));
  throw new ESP32UnableToGetLatestFirmware('Failed to load data');
}

/** getLatestRFM6601APPFirmware: GET /latest-rfm6601-app/, as the ESP32 one. */
export async function getLatestRFM6601APPFirmware(): Promise<Firmware> {
  await authOrThrow();
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/latest-rfm6601-app/`,
  ).getSecureData();
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body).
    return parseFirmware(first(JSON.parse(response.body) as Json[]));
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new RFM6601UnableToGetLatestFirmware('Error Code d7562:'));
  throw new RFM6601UnableToGetLatestFirmware('Failed to load data');
}

/**
 * getDeviceUpdateStatus: auth() (its result ignored) → GET /firmware_update/{id} (no slash: the
 * server redirects it) → the body parsed whatever the status. Any failure is reported and thrown
 * again: the poller decides whether a miss matters.
 */
export async function getDeviceUpdateStatus(
  id: number,
): Promise<FirmwareUpdate> {
  try {
    await new AuthRequestManager().auth();
    const response = await new NetworkHelper(
      `${nodeBaseUrlHttp()}/firmware_update/${id}`,
    ).getSecureData();
    // PORT-GAP: log.i("fw_update_packet:<body>").
    return parseFirmwareUpdate(JSON.parse(response.body) as Json);
  } catch (error) {
    reportError(error);
    throw error;
  }
}
