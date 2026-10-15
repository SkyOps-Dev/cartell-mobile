// Port of Flutter's Icon widget: the glyph drawn at `size` with height 1.0 inside a size × size
// box. Default size 24 (IconThemeData's default).
//
// Placement follows icon.dart: SizedBox(size) → Center → RichText(overflow: visible). The text gets
// at most `size` of width, so a glyph narrower than the box is centred, and a wider one (the Font
// Awesome "long" arrow and the eyes, 1.125 em) starts at the box's left edge and spills past its
// right edge. Android's TextView clips its own drawing to its bounds, so the Text here is given
// the glyph's full advance width and placed by hand. Some glyphs also reach past the font's line
// (Font Awesome's wrench goes 8/512 em below its descent), so the Text gets a quarter of `size`
// of padding above and below: the line, and so the baseline, stays where it was, and nothing is
// clipped vertically either.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { IconData } from './iconData';

type Props = {
  icon: IconData;
  size?: number;
  color: string;
  /** Screen-reader label (Flutter's semanticLabel). Icons without one are hidden from it. */
  accessibilityLabel?: string;
};

export function Icon({ icon, size = 24, color, accessibilityLabel }: Props) {
  const advance = size * (icon.advance ?? 1);
  const left = advance <= size ? (size - advance) / 2 : 0;
  const overflow = Math.ceil(size * 0.25);
  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={
        accessibilityLabel !== undefined ? 'yes' : 'no-hide-descendants'
      }
    >
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          styles.glyph,
          {
            left,
            // One extra pixel so rounding never clips the glyph's last column.
            width: advance + 1,
            top: -overflow,
            height: size + overflow * 2,
            paddingVertical: overflow,
            fontFamily: icon.fontFamily,
            fontSize: size,
            lineHeight: size,
            color,
          },
        ]}
      >
        {String.fromCodePoint(icon.codePoint)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'visible' },
  glyph: {
    position: 'absolute',
    textAlign: 'left',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
