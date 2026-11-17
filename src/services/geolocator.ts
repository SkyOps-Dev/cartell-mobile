// Port of the four geolocator calls Detect Location makes (a sensor's Edit Coordinates,
// screens/sensors/edit_coordinates.dart; geolocator 13 with geolocator_android 4.6.2 and
// geolocator_apple 2.3.13), with Flutter's LocationPermission values:
// - isLocationServiceEnabled: the app's own CartellGeolocator module (GeolocatorModule.kt / .m).
// - checkPermission / requestPermission: on Android through PermissionsAndroid, for both location
//   permissions the manifest declares (fine and coarse, as geolocator asks for every one declared);
//   on iOS through CartellGeolocator (requestWhenInUseAuthorization), as geolocator maps it.
// - getCurrentPosition (high accuracy, no time limit, a fresh fix): @react-native-community/
//   geolocation, which uses Google Play's fused location when Play services are there (else
//   Android's LocationManager), as geolocator does. Its own permission requests are switched off:
//   the steps above make them.

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
 * Geolocator.getCurrentPosition(locationSettings: LocationSettings(accuracy: high)): one fresh
 * fix, waiting as long as it takes. Rejects with the library's error when no fix can be had.
 */
export function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
}> {
  if (!configured) {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: true,
      authorizationLevel: 'whenInUse',
      locationProvider: 'auto',
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
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  });
}
