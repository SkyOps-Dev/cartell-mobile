// Port of frontend/lib/utilities/scaling.dart (spec 18 §1): how much the OS font size enlarges text
// of a given size, for the screens that reflow at a threshold.
// PORT-GAP: Flutter's textScaler.scale(size) / size follows Android 14+'s non-linear font
// scaling (large sizes grow less than small ones); this uses React Native's linear fontScale.

import { useWindowDimensions } from 'react-native';

/** getScalingFactor(context, fontSize): textScaler.scale(fontSize) / fontSize. */
export function useScalingFactor(_fontSize: number): number {
  return useWindowDimensions().fontScale;
}

/** bigFont(context, fontSize): the scaling factor at that size is above 1.4. */
export function useBigFont(fontSize: number): boolean {
  return useScalingFactor(fontSize) > 1.4;
}
