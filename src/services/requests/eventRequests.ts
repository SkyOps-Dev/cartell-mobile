// Port of frontend/lib/services/requests/event_requests.dart (spec 04 §5, spec 12 §5): the three
// event-history lists. Flutter sends them to Django; here they go to Node, which serves them since
// F09. A page after the first is the server's own `next` link, used as given except that its scheme
// is made to match shouldUseTLS. Each reports Flutter's error code and throws Flutter's exception.

import { config, nodeBaseUrlHttp } from '../../config/environment';
import { Event, parseEvent } from '../../models/event';
import type { Json } from '../../models/jsonParser';
import type { Sensor } from '../../models/sensor';
import {
  UnableToUpdateExceptions,
  UpdateTokenFailedException,
} from '../exceptions';
import { reportError } from '../reportError';
import { AuthRequestManager } from './authRequests';
import { NetworkHelper } from './networkHelper';

/** A `next` link with its scheme set to the app's (http: ↔ https:). */
function withAppScheme(url: string): string {
  return config.shouldUseTLS
    ? url.replaceAll('http:', 'https:')
    : url.replaceAll('https:', 'http:');
}

/**
 * auth() (`authCode` on failure, which throws) → GET `firstUrl`, or the `next` link given → 200:
 * the page through the Event parser; else `failCode`, and it throws.
 */
async function eventPage(
  authCode: string,
  failCode: string,
  firstUrl: string,
  nextURL: string | null | undefined,
): Promise<Event> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new UpdateTokenFailedException(authCode));
    throw new UpdateTokenFailedException('Failed to load data');
  }
  const url =
    nextURL === null || nextURL === undefined || nextURL === ''
      ? firstUrl
      : withAppScheme(nextURL);
  const response = await new NetworkHelper(url).getSecureData();
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body) (setDeviceEvents first logs
    // 'This is what you are looking for --------------').
    return parseEvent(JSON.parse(response.body) as Json);
  }
  // PORT-GAP: log.i(response.statusCode) (setSensorEventData only).
  reportError(new UnableToUpdateExceptions(failCode));
  throw new UnableToUpdateExceptions('Failed to load data');
}

/** setEventData: All Event History, `/activations` (no slash: the server redirects it). */
export function setEventData({
  nextURL,
}: { nextURL?: string | null } = {}): Promise<Event> {
  return eventPage(
    'Error Code 4b6cf:',
    'Error Message 59538:',
    `${nodeBaseUrlHttp()}/activations`,
    nextURL,
  );
}

/** setSensorEventData: a sensor's history, `/sensors/{id}/activations/`. */
export function setSensorEventData({
  sensor,
  nextUrl,
}: {
  sensor: Sensor;
  nextUrl?: string | null;
}): Promise<Event> {
  return eventPage(
    'Error Code df3dc:',
    'Error Message 0161e:',
    `${nodeBaseUrlHttp()}/sensors/${sensor.id}/activations/`,
    nextUrl,
  );
}

/** setDeviceEvents: a hub's history, `/devices/{id}/activations` (no slash: redirected). */
export function setDeviceEvents({
  deviceID,
  nextURL,
}: {
  deviceID: number;
  nextURL?: string | null;
}): Promise<Event> {
  return eventPage(
    'Error Code 24b87:',
    'Error Message 50748:',
    `${nodeBaseUrlHttp()}/devices/${deviceID}/activations`,
    nextURL,
  );
}
