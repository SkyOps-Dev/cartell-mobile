// Port of Material 3's FloatingActionButton as the app uses it (floating_action_button.dart
// _FABDefaultsM3; spec 07 §3.1). Placement on the screen is the Scaffold's job
// (floatingActionButtonLocation), as in Flutter.
// - 56 × 56, radius 16, elevation 6. The shadow never changes, so it is pre-drawn exactly from the
//   values measured on the Flutter app (RMX5070, 2026-10-13: the button's square moved down 5.8,
//   Gaussian blur σ 3.67, black at 0.24) by scripts/make-fab-shadow.py
//   (assets/images/fab_shadow*.png) and shown as an image, the same on every platform and Android
//   version (PARITY_ISSUES P7). Flutter draws it even under a transparent fill.
// - The icon defaults to size 24 in foregroundColor onPrimaryContainer (#EADDFF); a call site's
//   own Icon colour wins, as in Flutter. Splash is onPrimaryContainer at 0.1 whatever the icon's
//   colour. The FAB sets no highlight colour, so RawMaterialButton's InkWell uses the theme's
//   #40CCCCCC (measured 2026-10-13).
// - `tooltip`: a long press shows it (and cancels the tap).
// - Disabled when onPressed is null.

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import {
  ColorScheme,
  kInkHighlightColor,
  withOpacity,
} from '../../theme/colors';
import { InkWell } from '../ink/InkWell';
import { useTooltip } from '../tooltip/Tooltip';

/** foregroundColor default: the colour a FAB's icon takes when the call site sets none. */
export const kFabForegroundColor = ColorScheme.onPrimaryContainer;
export const kFabSize = 56;

const shadow = require('../../../assets/images/fab_shadow.png');
const SHADOW_OFFSET_Y = 5.8;
// The image has room for the blur to fade out in: 3σ (σ 3.67) on every side.
const SHADOW_PAD = 12;

type Props = {
  onPressed: (() => void) | null;
  backgroundColor: string;
  tooltip?: string;
  /** The button's content, normally an Icon. */
  children: React.ReactNode;
};

export function FloatingActionButton({
  onPressed,
  backgroundColor,
  tooltip,
  children,
}: Props) {
  const enabled = onPressed !== null;
  const { targetRef, handlers } = useTooltip(tooltip);
  return (
    <View ref={targetRef} collapsable={false} style={styles.fab}>
      <Image source={shadow} style={styles.shadow} />
      {backgroundColor !== 'transparent' && (
        // The shadow image sits under the button; an opaque fill covers it, as Flutter's Material
        // paints its colour over its own shadow.
        <View style={[styles.fill, { backgroundColor }]} />
      )}
      <InkWell
        {...handlers}
        accessibilityRole="button"
        accessibilityLabel={tooltip}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={enabled ? onPressed : undefined}
        borderRadius={16}
        highlightColor={kInkHighlightColor}
        splashColor={withOpacity(kFabForegroundColor, 0.1)}
        style={styles.inner}
      >
        {children}
      </InkWell>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: kFabSize,
    height: kFabSize,
    borderRadius: 16,
  },
  shadow: {
    position: 'absolute',
    left: -SHADOW_PAD,
    top: SHADOW_OFFSET_Y - SHADOW_PAD,
    width: kFabSize + SHADOW_PAD * 2,
    height: kFabSize + SHADOW_PAD * 2,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  inner: {
    width: kFabSize,
    height: kFabSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
