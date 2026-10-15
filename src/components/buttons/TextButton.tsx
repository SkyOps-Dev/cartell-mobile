// Port of Material 3's TextButton as the app uses it (spec 07 §3.1, text_button.dart
// _TextButtonDefaultsM3): labelLarge text, padding 12 × 8 (_scaledPadding; the 12/8/16/8 split
// is TextButton.icon's, which the app does not use),
// minimum 64 × 40, stadium ink shape, pressed overlay = primary (#D0BCFF) at 0.1, tap target
// padded to 48. The padding is layout space in Flutter (`_InputPadding`), so the button takes
// 48 of height in its row. Call sites pass the label colour (amber in the auth screens); an
// explicit colour wins even when disabled, as a Text style does in Flutter. Without one the label
// is the theme primary, or onSurface at 0.38 when disabled.

import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { ColorScheme, withOpacity } from '../../theme/colors';
import { M3, textStyle } from '../../theme/typography';
import { InkWell } from '../ink/InkWell';

type Props = {
  label: string;
  color?: string;
  onPressed?: (() => void) | null;
};

export function TextButton({ label, color, onPressed }: Props) {
  const enabled = onPressed !== null && onPressed !== undefined;
  const overlay = withOpacity(ColorScheme.primary, 0.1);
  return (
    <InkWell
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={enabled ? onPressed : undefined}
      hitSlop={{ top: 4, bottom: 4 }}
      borderRadius={1000}
      highlightColor={overlay}
      splashColor={overlay}
      style={styles.button}
    >
      <Text
        style={textStyle(M3.labelLarge, {
          color:
            color ??
            (enabled
              ? ColorScheme.primary
              : withOpacity(ColorScheme.onSurface, 0.38)),
        })}
      >
        {label}
      </Text>
    </InkWell>
  );
}

const styles = StyleSheet.create({
  button: {
    marginVertical: 4,
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
