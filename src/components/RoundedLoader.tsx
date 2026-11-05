// Port of frontend/lib/components/rounded_loader.dart: the stand-in for a RoundedButton while its
// work runs. Padding (default vertical 16) → Material(elevation 5, `buttonColor` or amber, radius
// 32) → a 45 × 350 box (narrower if its parent is) with a 24 × 24 spinner (stroke 3) in the
// middle, white unless `loaderColor` is given.

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { kCartellYellow, MaterialColors } from '../theme/colors';
import { shadow } from './buttons/MaterialPill';
import { CircularProgressIndicator } from './progress/CircularProgressIndicator';

type Props = {
  padding?: ViewStyle;
  buttonColor?: string;
  loaderColor?: string;
};

export function RoundedLoader({ padding, buttonColor, loaderColor }: Props) {
  return (
    <View style={[styles.stretch, padding ?? styles.defaultPadding]}>
      <View
        testID="rounded-loader"
        style={[
          styles.box,
          { backgroundColor: buttonColor ?? kCartellYellow },
          shadow(5),
        ]}
      >
        <CircularProgressIndicator
          size={24}
          strokeWidth={3}
          color={loaderColor ?? MaterialColors.white}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Stretched, so the box can be held to the parent's width.
  stretch: { alignSelf: 'stretch' },
  defaultPadding: { paddingVertical: 16 },
  box: {
    height: 45,
    width: 350,
    maxWidth: '100%',
    alignSelf: 'center',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
