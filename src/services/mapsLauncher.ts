// Port of MapsLauncher.launchCoordinates from maps_launcher 3.0.0+1 (lib/maps_launcher.dart; spec
// 13 §3), Find Sensor on a sensor's page: the phone's maps app at a point, with a label.
//
// The links are maps_launcher's own, built as Dart builds them: the numbers with Dart's
// double.toString ("40.0", not "40"), and the query with Uri's queryParameters encoding
// (Uri.encodeQueryComponent: everything but A–Z a–z 0–9 - . _ ~ is %-encoded, a space is "+", and
// an empty value drops its "="):
// - Android: geo://ul?q=<lat>,<lng>(<label>)
// - iOS: https://maps.apple.com/?ll=<lat>,<lng>&q=<label>
// maps_launcher launches them in an external non-browser app (url_launcher's
// externalNonBrowserApplication); Linking.openURL does the same here (the geo: link goes to the
// maps app, and maps.apple.com opens Apple Maps on iOS).

import { Linking, Platform } from 'react-native';

import { dartDoubleToString } from '../models/jsonParser';

/** Uri.encodeQueryComponent: RFC 3986 unreserved characters kept, a space as "+". */
export function encodeQueryComponent(component: string): string {
  return encodeURIComponent(component)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

/** Uri(queryParameters: …)'s query: key=value pairs, "=" left out for an empty value. */
function query(parameters: Record<string, string>): string {
  return Object.entries(parameters)
    .map(([key, value]) =>
      value === ''
        ? encodeQueryComponent(key)
        : `${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`,
    )
    .join('&');
}

/** MapsLauncher.createCoordinatesUri(latitude, longitude, label), on this phone's platform. */
export function createCoordinatesUri(
  latitude: number,
  longitude: number,
  label?: string,
): string {
  const lat = dartDoubleToString(latitude);
  const lng = dartDoubleToString(longitude);
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?${query({
      ll: `${lat},${lng}`,
      q: label ?? `${lat}, ${lng}`,
    })}`;
  }
  let q = `${lat},${lng}`;
  if (label !== undefined) {
    q += `(${label})`;
  }
  return `geo://ul?${query({ q })}`;
}

/** MapsLauncher.launchCoordinates: opens the link; resolves when it has been handed over. */
export async function launchCoordinates(
  latitude: number,
  longitude: number,
  label?: string,
): Promise<void> {
  await Linking.openURL(createCoordinatesUri(latitude, longitude, label));
}
