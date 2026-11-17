/// <reference types="node" />
// Detect Location's native wiring (a sensor's Edit Coordinates). These fail only on a device, the
// first time someone taps Detect Location, and nothing in the JS build notices them going away.

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');

describe('Android', () => {
  test('GeolocatorModule is registered in CartellPackage', () => {
    expect(
      read('android/app/src/main/java/com/iwatllc/cartell/CartellPackage.kt'),
    ).toContain('GeolocatorModule(reactContext)');
  });

  test('it is the CartellGeolocator module src/services/geolocator.ts calls', () => {
    const module = read(
      'android/app/src/main/java/com/iwatllc/cartell/GeolocatorModule.kt',
    );
    expect(module).toContain(
      'override fun getName(): String = "CartellGeolocator"',
    );
    expect(module).toContain('fun isLocationServiceEnabled(promise: Promise)');
  });

  test('the manifest declares fine and coarse location, as Flutter’s merged manifest does', () => {
    // geolocator asks for every location permission declared; Android 12+ ignores a request for
    // fine location alone.
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('android.permission.ACCESS_FINE_LOCATION');
    expect(manifest).toContain('android.permission.ACCESS_COARSE_LOCATION');
  });

  test('the fix comes from @react-native-community/geolocation, pinned', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['@react-native-community/geolocation']).toBe(
      '3.4.0',
    );
  });
});

describe('iOS (written, not yet built: no Mac)', () => {
  test('GeolocatorModule.m is in the Xcode project and its Sources phase', () => {
    const pbxproj = read('ios/Cartell.xcodeproj/project.pbxproj');
    expect(pbxproj).toContain(
      '/* GeolocatorModule.m in Sources */ = {isa = PBXBuildFile; fileRef = A1CF0EDB0000000000000008',
    );
    expect(pbxproj).toContain('path = Cartell/GeolocatorModule.m;');
    expect(
      pbxproj.match(
        /A1CF0EDB0000000000000007 \/\* GeolocatorModule\.m in Sources \*\//g,
      ),
    ).toHaveLength(2);
  });

  test('the module answers the three calls the JS side makes', () => {
    const source = read('ios/Cartell/GeolocatorModule.m');
    expect(source).toContain('RCT_EXPORT_MODULE(CartellGeolocator)');
    for (const method of [
      'isLocationServiceEnabled',
      'checkPermission',
      'requestPermission',
    ]) {
      expect(source).toContain(`RCT_EXPORT_METHOD(${method}`);
    }
  });

  test('Info.plist explains the when-in-use location request', () => {
    expect(read('ios/Cartell/Info.plist')).toContain(
      'NSLocationWhenInUseUsageDescription',
    );
  });
});
