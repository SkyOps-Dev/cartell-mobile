// Port of Material 3's standard IconButton (icon_button.dart _IconButtonDefaultsM3; spec 07 §3.1):
// a 48 × 48 tap target holding a 40 × 40 stadium (padding 8) with the icon centred; pressed
// overlay onSurfaceVariant (#CAC4D0) at 0.1. `tooltip` becomes the accessibility label and, as
// in Flutter (IconButton wraps itself in a Tooltip), shows on a long press over the 48 × 48 box.

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ColorScheme, withOpacity } from '../../theme/colors';
import { Icon } from '../icons/Icon';
import type { IconData } from '../icons/iconData';
import { InkWell } from '../ink/InkWell';
import { useTooltip } from '../tooltip/Tooltip';

type Props = {
  icon: IconData;
  color: string;
  size?: number;
  tooltip?: string;
  onPressed?: (() => void) | null;
};

export function IconButton({
  icon,
  color,
  size = 24,
  tooltip,
  onPressed,
}: Props) {
  const enabled = onPressed !== null && onPressed !== undefined;
  const overlay = withOpacity(ColorScheme.onSurfaceVariant, 0.1);
  const { targetRef, handlers } = useTooltip(tooltip);
  return (
    <View ref={targetRef} collapsable={false} style={styles.tapTarget}>
      <InkWell
        {...handlers}
        accessibilityRole="button"
        accessibilityLabel={tooltip}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={enabled ? onPressed : undefined}
        hitSlop={4}
        borderRadius={1000}
        highlightColor={overlay}
        splashColor={overlay}
        style={styles.button}
      >
        <Icon icon={icon} color={color} size={size} />
      </InkWell>
    </View>
  );
}

const styles = StyleSheet.create({
  tapTarget: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minWidth: 40,
    minHeight: 40,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
