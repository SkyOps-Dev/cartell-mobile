// Port of frontend/lib/screens/events/phone_rotation_manager.dart as the app uses it: only
// allowAll(), from the three history screens as they open and close (spec 12, spec 18 §2), through
// the CartellOrientation native module:
// - Android: the activity's requested orientation becomes FULL_USER (all four, upside-down too,
//   with auto-rotate on) and stays so (android/.../OrientationModule.kt).
// - iOS: the same set the app already allows, re-evaluated (ios/Cartell/OrientationModule.m).
//   Written without a Mac: not compiled or tried yet.
// setToVerticalOnly and setToHorizontalOnly are never called in Flutter, so they are not ported.

import { NativeModules } from 'react-native';

type CartellOrientation = { allowAll(): void };

export function allowAllOrientations(): void {
  (
    NativeModules.CartellOrientation as CartellOrientation | undefined
  )?.allowAll();
}
