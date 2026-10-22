// Port of Material 3's standard IconButton (icon_button.dart _IconButtonDefaultsM3; spec 07 §3.1):
// a tap target of at least 48 × 48 holding a stadium of at least 40 × 40 (padding 8 around the
// icon, so a 50 icon makes it 66 × 66) with the icon centred; pressed
// overlay onSurfaceVariant (#CAC4D0) at 0.1. `tooltip` becomes the accessibility label and, as
// in Flutter (IconButton wraps itself in a Tooltip), shows on a long press over the 48 × 48 box.
// Disabled (onPressed null), the icon is onSurface at 0.38 whatever `color` is (disabledColor).

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
        <Icon
          icon={icon}
          color={enabled ? color : kDisabledIconColor}
          size={size}
        />
      </InkWell>
    </View>
  );
}

const kDisabledIconColor = withOpacity(ColorScheme.onSurface, 0.38);

const styles = StyleSheet.create({
  tapTarget: {
    minWidth: 48,
    minHeight: 48,
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
