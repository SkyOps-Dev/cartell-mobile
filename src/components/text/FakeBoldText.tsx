// Bold text in a font that ships without a bold face, drawn as Flutter draws it. Flutter (Skia)
// fakes bold by growing each glyph's outline by size × scale / 2 without widening the text, where
// scale runs from 1/24 at 9 px to 1/32 at 36 px (SkScalerContext kStdFakeBoldInterp). Android's
// own fake bold is heavier and widens the text, and iOS does not synthesise bold for a custom font
// at all, so the regular face is drawn plus four copies offset by that outline growth
// (PARITY_ISSUES P1, where this was measured on the red server tag).
// Used by the server tag (DroidSansMono, Android only: on iOS the tag uses the platform's bold
// face of its fallback font) and the Hubs title (Source Sans Pro).

import React from 'react';
import {
  PixelRatio,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';

/** Skia's fake-bold outline growth for a font size, in dp. */
export function fakeBoldOutset(fontSize: number, pixelRatio: number): number {
  const sizePx = fontSize * pixelRatio;
  const t = Math.min(Math.max((sizePx - 9) / (36 - 9), 0), 1);
  const scale = 1 / 24 + t * (1 / 32 - 1 / 24);
  return (sizePx * scale) / 2 / pixelRatio;
}

// Overlapping copies cover more than an exact outline growth; tuned against Flutter's ink on the
// server tag (P1).
export const kFakeBoldTune = 0.6;

type Props = {
  children: string;
  /** The regular face's style. Its fontSize sets the outline growth. */
  style: StyleProp<TextStyle>;
  /** False draws the regular face only (the caller handles bold another way). */
  enabled?: boolean;
  numberOfLines?: number;
};

export function FakeBoldText({
  children,
  style,
  enabled = true,
  numberOfLines,
}: Props) {
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 14;
  const outset = fakeBoldOutset(fontSize, PixelRatio.get()) * kFakeBoldTune;
  const offsets: [number, number][] = [
    [outset, 0],
    [-outset, 0],
    [0, outset],
    [0, -outset],
  ];
  return (
    <View>
      <Text style={style} numberOfLines={numberOfLines}>
        {children}
      </Text>
      {enabled &&
        offsets.map(([x, y]) => (
          <Text
            key={`${x},${y}`}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            numberOfLines={numberOfLines}
            style={[
              style,
              styles.copy,
              { transform: [{ translateX: x }, { translateY: y }] },
            ]}
          >
            {children}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { position: 'absolute', left: 0, top: 0, right: 0 },
});
