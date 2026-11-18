// Port of frontend/lib/utilities/device_info.dart: the phone's name and platform sent with the push
// token (spec 09 §6), as device_info_plus 11.5.0 gives them.
// - Android: AndroidDeviceInfo.model, which is Build.MODEL; React Native's Platform.constants.Model
//   is the same value, so no native code.
// - iOS: IosDeviceInfo.modelName, the plugin's own name for the machine identifier ("Unknown
//   device" when its table does not list it): the CartellDeviceInfo module
//   (ios/Cartell/DeviceInfoModule.m), a copy of that table. Written without a Mac: not compiled
//   or tried yet.

import { NativeModules, Platform } from 'react-native';

type CartellDeviceInfo = { modelName(): Promise<string> };

export async function getDeviceName(): Promise<string> {
  let deviceName = '';
  if (Platform.OS === 'android') {
    deviceName = (Platform.constants as { Model: string }).Model;
  } else if (Platform.OS === 'ios') {
    deviceName = await (
      NativeModules.CartellDeviceInfo as CartellDeviceInfo
    ).modelName();
  }
  return deviceName;
}

export async function getPlatform(): Promise<string> {
  return Platform.OS === 'android' ? 'Android' : 'iOS';
}
