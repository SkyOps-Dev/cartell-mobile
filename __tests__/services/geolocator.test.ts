// Detect Location's permission steps (geolocator 13): on Android, both location permissions are
// asked for, and the answers map as geolocator_android 4.6.2's PermissionManager maps them; on iOS
// the app's own module answers.

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import {
  checkPermission,
  getCurrentPosition,
  isLocationServiceEnabled,
  requestPermission,
} from '../../src/services/geolocator';

const { GRANTED, DENIED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;
const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

afterEach(() => jest.restoreAllMocks());

describe('Android', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));

  test('checkPermission: either permission granted is whileInUse', async () => {
    jest
      .spyOn(PermissionsAndroid, 'check')
      .mockImplementation(async p => p === COARSE);
    expect(await checkPermission()).toBe('whileInUse');
  });

  test('checkPermission: neither is denied, never deniedForever', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    expect(await checkPermission()).toBe('denied');
  });

  test.each([
    [GRANTED, DENIED, 'whileInUse'],
    [DENIED, GRANTED, 'whileInUse'],
    [DENIED, DENIED, 'denied'],
    [NEVER_ASK_AGAIN, DENIED, 'denied'],
    [NEVER_ASK_AGAIN, NEVER_ASK_AGAIN, 'deniedForever'],
  ])(
    'requestPermission asks for fine and coarse: %s / %s → %s',
    async (fine, coarse, expected) => {
      const request = jest
        .spyOn(PermissionsAndroid, 'requestMultiple')
        .mockResolvedValue({ [FINE]: fine, [COARSE]: coarse } as never);
      expect(await requestPermission()).toBe(expected);
      expect(request).toHaveBeenCalledWith([FINE, COARSE]);
    },
  );
});

describe('iOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  test('check and request come from CartellGeolocator', async () => {
    const native = NativeModules.CartellGeolocator;
    native.checkPermission.mockResolvedValueOnce('deniedForever');
    native.requestPermission.mockResolvedValueOnce('whileInUse');
    expect(await checkPermission()).toBe('deniedForever');
    expect(await requestPermission()).toBe('whileInUse');
  });
});

test('isLocationServiceEnabled comes from CartellGeolocator', async () => {
  NativeModules.CartellGeolocator.isLocationServiceEnabled.mockResolvedValueOnce(
    false,
  );
  expect(await isLocationServiceEnabled()).toBe(false);
});

test("getCurrentPosition asks for a high-accuracy fix with geolocator's request settings and no permission request", async () => {
  const Geolocation = jest.requireMock(
    '@react-native-community/geolocation',
  ).default;
  expect(await getCurrentPosition()).toEqual({
    latitude: 40.7127753,
    longitude: -74.0059728,
  });
  expect(Geolocation.setRNConfiguration).toHaveBeenCalledWith({
    skipPermissionRequests: true,
    authorizationLevel: 'whenInUse',
    locationProvider: 'playServices',
  });
  expect(Geolocation.getCurrentPosition.mock.calls[0][2]).toEqual({
    enableHighAccuracy: true,
    interval: 5000,
    fastestInterval: 5000,
    distanceFilter: 0,
    maximumAge: 5000,
  });
});
