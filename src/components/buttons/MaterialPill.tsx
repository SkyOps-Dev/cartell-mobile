// The shared shape behind RoundedButton and the popup buttons: Flutter's
// `Material(elevation, color, borderRadius: 32) → MaterialButton(minWidth, height)`.
// (spec 07 §3.1, material_button.dart / button.dart):
// - The MaterialButton's tap target is padded to at least 48 × 48, and the coloured Material
//   wraps it, so the pill is max(48, inner) tall.
// - The inner button keeps its own height (`height`, or its content) centred in the pill. Its ink
//   shape is a 2-radius rounded rectangle over that inner area, NOT clipped to the pill, so the
//   press highlight's corners show past the pill's round ends.
// - Inner padding is horizontal 16; ink colours are ThemeData.dark()'s highlight/splash.

import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

import { kInkHighlightColor, kInkSplashColor } from '../../theme/colors';
import { InkWell } from '../ink/InkWell';

const TAP_TARGET = 48;

type Props = {
  color: string;
  elevation: number;
  /** MaterialButton.minWidth. Use `stretch` for minWidth: double.infinity. */
  minWidth: number | 'stretch';
  /** MaterialButton.height: the inner button's minimum height. */
  height: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function MaterialPill({
  color,
  elevation,
  minWidth,
  height,
  onPress,
  accessibilityLabel,
  children,
  style,
}: Props) {
  const enabled = onPress !== undefined;
  const slop = Math.max(0, (TAP_TARGET - height) / 2);
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: color },
        shadow(elevation),
        minWidth === 'stretch'
          ? styles.stretch
          : { minWidth: Math.max(minWidth, TAP_TARGET) },
        style,
      ]}
    >
      <InkWell
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={onPress}
        hitSlop={{ top: slop, bottom: slop }}
        borderRadius={2}
        highlightColor={kInkHighlightColor}
        splashColor={kInkSplashColor}
        style={[styles.inner, { minHeight: height }]}
      >
        {children}
      </InkWell>
    </View>
  );
}

// Material elevation shadow. Android uses the same native shadow as Flutter's PhysicalModel;
// iOS is an approximation to tune against a reference.
function shadow(elevation: number): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation };
  }
  return {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: elevation,
    shadowOffset: { width: 0, height: elevation / 2 },
  };
}

const styles = StyleSheet.create({
  pill: {
    minHeight: TAP_TARGET,
    borderRadius: 32,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  stretch: { alignSelf: 'stretch' },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});
