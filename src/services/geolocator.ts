// Port of the four geolocator calls Detect Location makes (a sensor's Edit Coordinates,
// screens/sensors/edit_coordinates.dart; geolocator 13 with geolocator_android 4.6.2 and
// geolocator_apple 2.3.13), with Flutter's LocationPermission values:
// - isLocationServiceEnabled: the app's own CartellGeolocator module (GeolocatorModule.kt / .m).
// - checkPermission / requestPermission: on Android through PermissionsAndroid, for both location
//   permissions the manifest declares (fine and coarse, as geolocator asks for every one declared);
//   on iOS through CartellGeolocator (requestWhenInUseAuthorization), as geolocator maps it.
// - getCurrentPosition (high accuracy, no time limit, geolocator's request settings):
//   @react-native-community/geolocation, on Google Play's fused location when Play services are
//   there (else Android's LocationManager), as geolocator does (GeolocationManager.
//   createLocationClient). That needs locationProvider "playServices": the library's "auto" sends
//   nothing on Android, so it stays on LocationManager, which with high accuracy waits for GPS
//   alone and was seconds slower than Flutter. Its own permission requests are switched off: the
//   steps above make them.
//   One difference, in the library: when fused location reports "not available" while location
//   is on (weak signal indoors), it fails at once ("Can't Get Location"); geolocator keeps waiting.

import Geolocation from '@react-native-community/geolocation';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export type LocationPermission =
  | 'denied'
  | 'deniedForever'
  | 'whileInUse'
  | 'always';

type GeolocatorNative = {
  isLocationServiceEnabled(): Promise<boolean>;
  checkPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
};

function native(): GeolocatorNative {
  const module = NativeModules.CartellGeolocator as
    | GeolocatorNative
    | undefined;
  if (!module) {
    throw new Error('CartellGeolocator is not linked');
  }
  return module;
}

const ANDROID_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
];

/** Geolocator.isLocationServiceEnabled(). */
export function isLocationServiceEnabled(): Promise<boolean> {
  return native().isLocationServiceEnabled();
}

/**
 * Geolocator.checkPermission(). Android (PermissionManager.checkPermissionStatus): either
 * permission granted is "whileInUse" (no background permission is declared), else "denied" (it
 * never says "deniedForever" before a request).
 */
export async function checkPermission(): Promise<LocationPermission> {
  if (Platform.OS !== 'android') {
    return native().checkPermission();
  }
  for (const permission of ANDROID_PERMISSIONS) {
    if (await PermissionsAndroid.check(permission)) {
      return 'whileInUse';
    }
  }
  return 'denied';
}

/**
 * Geolocator.requestPermission(). Android (PermissionManager.onRequestPermissionsResult): either
 * granted is "whileInUse"; otherwise "deniedForever" when Android would no longer show the request
 * for any of them (never_ask_again for both), else "denied".
 */
export async function requestPermission(): Promise<LocationPermission> {
  if (Platform.OS !== 'android') {
    return native().requestPermission();
  }
  const results = await PermissionsAndroid.requestMultiple(ANDROID_PERMISSIONS);
  const answers = ANDROID_PERMISSIONS.map(permission => results[permission]);
  if (answers.includes(PermissionsAndroid.RESULTS.GRANTED)) {
    return 'whileInUse';
  }
  if (
    answers.every(
      answer => answer === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    )
  ) {
    return 'deniedForever';
  }
  return 'denied';
}

let configured = false;

/**
 * Geolocator.getCurrentPosition(locationSettings: LocationSettings(accuracy: high)): one fix,
 * waiting as long as it takes. Rejects with the library's error when no fix can be had.
 * The request matches geolocator_android's (FusedLocationClient.buildLocationRequest with its
 * LocationOptions defaults): 5 s interval and minimum interval, 0 m distance filter, and a fix up
 * to one interval old accepted (Play services' implicit max update age), so a recent fix answers
 * at once. Requiring a brand-new fix (maximumAge 0) made it wait for the hardware, often for long.
 */
export function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
}> {
  if (!configured) {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: true,
      authorizationLevel: 'whenInUse',
      locationProvider: 'playServices',
    });
    configured = true;
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      error => reject(error),
      {
        enableHighAccuracy: true,
        interval: 5000,
        fastestInterval: 5000,
        distanceFilter: 0,
        maximumAge: 5000,
      },
    );
  });
}
