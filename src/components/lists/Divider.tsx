// Port of Material 3's Divider (material/divider.dart, _DividerDefaultsM3): a box `height` tall
// (16 by default) with a `thickness` line (1) across its middle, inset by `indent` / `endIndent`,
// in outlineVariant (#49454F; measured in the Flutter drawer, RMX5070, 2026-10-15).

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ColorScheme } from '../../theme/colors';

/** Divider.createBorderSide's colour: also the line under a DrawerHeader. */
export const kDividerColor = ColorScheme.outlineVariant;

type Props = {
  height?: number;
  thickness?: number;
  indent?: number;
  endIndent?: number;
};

export function Divider({
  height = 16,
  thickness = 1,
  indent = 0,
  endIndent = 0,
}: Props) {
  return (
    <View style={[styles.box, { height }]}>
      <View
        style={{
          height: thickness,
          marginLeft: indent,
          marginRight: endIndent,
          backgroundColor: kDividerColor,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { justifyContent: 'center' },
});
