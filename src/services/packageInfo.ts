// Port of package_info_plus's PackageInfo.fromPlatform(), for the two fields the app reads
// (welcome_screen.dart: the Debug Info panel's version and build number). The values come from
// the app's own native module: android/.../PackageInfoModule.kt and ios/Cartell/PackageInfoModule.m.

import { NativeModules } from 'react-native';

export type PackageInfo = { version: string; buildNumber: string };

type PackageInfoNative = { fromPlatform(): Promise<PackageInfo> };

export function packageInfoFromPlatform(): Promise<PackageInfo> {
  const native = NativeModules.CartellPackageInfo as
    | PackageInfoNative
    | undefined;
  if (!native) {
    return Promise.reject(new Error('CartellPackageInfo is not linked'));
  }
  return native.fromPlatform();
}
