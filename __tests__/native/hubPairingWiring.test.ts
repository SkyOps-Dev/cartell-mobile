/// <reference types="node" />
// Hub pairing's native wiring: the Wi-Fi modules (ports of wifi_iot 0.3.19+2 and
// network_info_plus 6.1.4), the UDP library, and the manifest entries Flutter's merged manifest
// has. These fail only on a device, in the middle of pairing, and nothing in the JS build notices
// them going away.

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');
const kotlin = (name: string) =>
  read(`android/app/src/main/java/com/iwatllc/cartell/${name}`);

describe('Android', () => {
  test('both modules are registered in CartellPackage', () => {
    const registered = kotlin('CartellPackage.kt');
    expect(registered).toContain('WifiIotModule(reactContext)');
    expect(registered).toContain('NetworkInfoModule(reactContext)');
  });

  test('CartellWifiIot answers every call src/services/wifiIot.ts makes', () => {
    const module = kotlin('WifiIotModule.kt');
    expect(module).toContain(
      'override fun getName(): String = "CartellWifiIot"',
    );
    for (const signature of [
      'fun isEnabled(promise: Promise)',
      'fun setEnabled(state: Boolean, shouldOpenSettings: Boolean, promise: Promise)',
      'fun connect(',
      'fun forceWifiUsage(useWifi: Boolean, promise: Promise)',
      'fun isConnected(promise: Promise)',
      'fun disconnect(promise: Promise)',
    ]) {
      expect(module).toContain(signature);
    }
    // The hub's network is joined local-only, as the plugin does for withInternet false.
    expect(module).toContain(
      '.removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)',
    );
  });

  test('CartellNetworkInfo reads the SSID', () => {
    const module = kotlin('NetworkInfoModule.kt');
    expect(module).toContain(
      'override fun getName(): String = "CartellNetworkInfo"',
    );
    expect(module).toContain('fun getWifiName(promise: Promise)');
  });

  test("the manifest matches Flutter's merged manifest for Wi-Fi", () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    for (const permission of [
      'ACCESS_WIFI_STATE',
      'CHANGE_WIFI_STATE',
      'CHANGE_NETWORK_STATE',
      'ACCESS_COARSE_LOCATION',
      'WRITE_SETTINGS',
    ]) {
      expect(manifest).toContain(`android.permission.${permission}`);
    }
    expect(manifest).toContain(
      '<uses-feature android:name="android.hardware.wifi" />',
    );
    // react-native-udp's multicast permission, which Flutter does not have, is removed.
    expect(manifest).toMatch(
      /android:name="android\.permission\.CHANGE_WIFI_MULTICAST_STATE"\s+tools:node="remove"/,
    );
  });

  test('the UDP socket comes from react-native-udp, pinned', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['react-native-udp']).toBe('4.1.7');
    expect(pkg.dependencies['@noble/ciphers']).toBe('2.4.0');
  });
});

describe('iOS (written, not yet built: no Mac)', () => {
  test('both modules are in the Xcode project and its Sources phase', () => {
    const pbxproj = read('ios/Cartell.xcodeproj/project.pbxproj');
    for (const [name, buildFile, fileRef] of [
      ['WifiIotModule', '11', '12'],
      ['NetworkInfoModule', '13', '14'],
    ]) {
      expect(pbxproj).toContain(
        `A1CF0EDB00000000000000${buildFile} /* ${name}.m in Sources */ = {isa = PBXBuildFile; fileRef = A1CF0EDB00000000000000${fileRef}`,
      );
      expect(pbxproj).toContain(`path = Cartell/${name}.m;`);
      expect(
        pbxproj.match(
          new RegExp(
            `A1CF0EDB00000000000000${buildFile} /\\* ${name}\\.m in Sources \\*/`,
            'g',
          ),
        ),
      ).toHaveLength(2);
    }
  });

  test('the modules answer the calls the JS side makes', () => {
    const wifi = read('ios/Cartell/WifiIotModule.m');
    expect(wifi).toContain('RCT_EXPORT_MODULE(CartellWifiIot)');
    for (const method of [
      'connect',
      'forceWifiUsage',
      'isEnabled',
      'isConnected',
      'disconnect',
    ]) {
      expect(wifi).toContain(`RCT_EXPORT_METHOD(${method}`);
    }
    const info = read('ios/Cartell/NetworkInfoModule.m');
    expect(info).toContain('RCT_EXPORT_MODULE(CartellNetworkInfo)');
    expect(info).toContain('RCT_EXPORT_METHOD(getWifiName');
  });

  test('the entitlements and Info.plist keys pairing needs are there', () => {
    const entitlements = read('ios/Cartell/Cartell.entitlements');
    expect(entitlements).toContain(
      'com.apple.developer.networking.HotspotConfiguration',
    );
    expect(entitlements).toContain('com.apple.developer.networking.wifi-info');
    expect(read('ios/Cartell/Info.plist')).toContain(
      'NSLocalNetworkUsageDescription',
    );
  });
});
