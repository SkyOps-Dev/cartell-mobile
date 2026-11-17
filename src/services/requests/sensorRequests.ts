// Port of frontend/lib/services/requests/sensor_requests.dart (spec 04 §5, spec 13): a hub's
// sensors and one sensor. Flutter sends them to Django; here they go to Node, which serves them
// since F08. Each reports the same error code as Flutter and throws the same exception.

import { nodeBaseUrlHttp } from '../../config/environment';
import type { Json } from '../../models/jsonParser';
import { parseSensor, Sensor } from '../../models/sensor';
import {
  UnableToUpdateSensorEventsException,
  UpdateStoredCredentialsFailedException,
} from '../exceptions';
import { reportError } from '../reportError';
import { AuthRequestManager } from './authRequests';
import { NetworkHelper } from './networkHelper';

/**
 * setSensors: auth() (11ebc on failure, which throws) → GET /devices/{id}/sensors, without the
 * trailing slash (the server redirects it) → below 300: each sensor through the Sensor parser;
 * else 04c7b, and it throws. Only Add Sensor's search calls it.
 */
export async function setSensors({
  deviceID,
}: {
  deviceID: number;
}): Promise<Sensor[]> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(
      new UpdateStoredCredentialsFailedException('Error Code 11ebc:'),
    );
    throw new UpdateStoredCredentialsFailedException('Failed to load data');
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/devices/${deviceID}/sensors`,
  ).getSecureData();
  if (response.statusCode < 300) {
    return (JSON.parse(response.body) as Json[]).map(parseSensor);
  }
  reportError(new UnableToUpdateSensorEventsException('Error Code 04c7b:'));
  throw new UnableToUpdateSensorEventsException('Failed to load data');
}

/**
 * setSensor: auth() (c3f22 on failure, which throws) → GET /sensors/{id}/ → below 300: the sensor
 * through the Sensor parser, merged into the cached one; else 40b27, and it throws. `deviceID` is
 * unused, as in Flutter.
 */
export async function setSensor({
  sensorID,
}: {
  deviceID: number;
  sensorID: number;
}): Promise<Sensor> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(
      new UpdateStoredCredentialsFailedException('Error Code c3f22:'),
    );
    throw new UpdateStoredCredentialsFailedException('Failed to load data');
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/sensors/${sensorID}/`,
  ).getSecureData();
  if (response.statusCode < 300) {
    // PORT-GAP: log.i(response.body); log.i('here you are'); log.i(myData).
    return parseSensor(JSON.parse(response.body) as Json);
  }
  reportError(new UnableToUpdateSensorEventsException('Error Code 40b27:'));
  throw new UnableToUpdateSensorEventsException('Failed to load data');
}

/**
 * deleteSensor: auth(), and if that fails it returns as though it worked (no report, no throw) →
 * DELETE /sensors/{id}/ → below 300: done; else 10a37, and it throws.
 */
export async function deleteSensor({
  sensorID,
}: {
  deviceID: number;
  sensorID: number;
}): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    return;
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/sensors/${sensorID}/`,
  ).secureDelete();
  if (response.statusCode < 300) {
    // PORT-GAP: log.i(response.statusCode); log.i('Sensor Deleted').
    return;
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new UnableToUpdateSensorEventsException('Error Code 10a37:'));
  throw new UnableToUpdateSensorEventsException('Failed to load data');
}

/**
 * updateSensorData: auth() (b323c on failure, which throws) → PATCH /sensors/{id}/ with the body
 * as given (rename: name; coordinates: latitude and longitude) → below 300: done; else 10a37, and
 * it throws.
 */
export async function updateSensorData({
  sensorID,
  body,
}: {
  deviceID: number;
  sensorID: number;
  body: Record<string, string>;
}): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(
      new UpdateStoredCredentialsFailedException('Error Code b323c:'),
    );
    throw new UpdateStoredCredentialsFailedException(
      'Failed to update sensor data',
    );
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/sensors/${sensorID}/`,
  ).patchSecureData({ body });
  if (response.statusCode < 300) {
    // PORT-GAP: log.i(body); log.i('successfully updated').
    return;
  }
  // PORT-GAP: log.i(response.statusCode); log.i(response.body).
  reportError(new UnableToUpdateSensorEventsException('Error Code 10a37:'));
  throw new UnableToUpdateSensorEventsException('Failed to patch sensor data');
}

/**
 * setSensorNotificationPolicy: auth() (b323c on failure, which throws) → PATCH /sensors/{id}/ with
 * should_send_notification "true" / "false" → only 200 is success; otherwise 10a37, and it throws.
 */
export async function setSensorNotificationPolicy(
  sensorID: number,
  shouldEnable: boolean,
): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(
      new UpdateStoredCredentialsFailedException('Error Code b323c:'),
    );
    throw new UpdateStoredCredentialsFailedException(
      'Failed to update sensor notification policy',
    );
  }
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/sensors/${sensorID}/`,
  ).patchSecureData({
    body: { should_send_notification: String(shouldEnable) },
  });
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body); log.i('successfully updated').
    return;
  }
  // PORT-GAP: log.i(response.statusCode).
  reportError(new UnableToUpdateSensorEventsException('Error Code 10a37:'));
  throw new UnableToUpdateSensorEventsException(
    'Failed to set notification policy',
  );
}
