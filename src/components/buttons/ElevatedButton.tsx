// Port of Material 3's default ElevatedButton (elevated_button.dart _ElevatedButtonDefaultsM3;
// spec 07 §3.1). Used unstyled by "Open Debug Info", which is why it is the app's only lavender
// element (Q41): background surfaceContainerLow (#1D1B20), label primary (#D0BCFF), elevation 1,
// stadium, padding horizontal 24, minimum 64 × 40, overlay primary at 0.1, labelLarge, tap target
// padded to 48 in layout.

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { ColorScheme, withOpacity } from '../../theme/colors';
import { M3, textStyle } from '../../theme/typography';
import { InkWell } from '../ink/InkWell';

type Props = {
  label: string;
  onPressed?: (() => void) | null;
};

export function ElevatedButton({ label, onPressed }: Props) {
  const enabled = onPressed !== null && onPressed !== undefined;
  const overlay = withOpacity(ColorScheme.primary, 0.1);
  return (
    <View style={styles.tapTarget}>
      <View style={[styles.surface, enabled ? styles.raised : null]}>
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
              color: enabled
                ? ColorScheme.primary
                : withOpacity(ColorScheme.onSurface, 0.38),
            })}
          >
            {label}
          </Text>
        </InkWell>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tapTarget: { paddingVertical: 4 },
  surface: {
    backgroundColor: ColorScheme.surfaceContainerLow,
    borderRadius: 1000,
  },
  raised:
    Platform.OS === 'android'
      ? { elevation: 1 }
      : {
          shadowColor: '#000000',
          shadowOpacity: 0.3,
          shadowRadius: 1,
          shadowOffset: { width: 0, height: 1 },
        },
  button: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
