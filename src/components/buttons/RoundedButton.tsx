// Port of frontend/lib/components/forms/rounded_button.dart (spec 07 §7, §3.1).
//
// Padding (default vertical 8) → pill (elevation 5, buttonColor, or Gravel #A2AAAD when
// onPressed is null) → MaterialButton(minWidth 200, height 45) → Padding(5) →
// Row(centred)[icon, 20, Flexible(title), trailing icon (padding h15)].
// The title uses MaterialButton's labelLarge (14, w500, 0.1, ×1.43) in buttonTitleColor.
//
// Width: always the parent's full width. RawMaterialButton centres its child with
// Center(widthFactor: 1.0) (button.dart:414), so the button is as wide as its Row, and the Row
// (mainAxisSize.max) takes all the width it is given. minWidth 200 never shows: every call site
// sits in a Column wider than that. Measured on step 3 of pairing (RMX5070, 2026-11-26): the pills
// span the content width, 20 in from each screen edge.

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { kCartellLightGray } from '../../theme/colors';
import { M3, textStyle } from '../../theme/typography';
import { Icon } from '../icons/Icon';
import type { IconData } from '../icons/iconData';
import { MaterialPill } from './MaterialPill';

type Props = {
  title?: string;
  buttonColor?: string;
  buttonTitleColor?: string;
  icon?: IconData;
  iconColor?: string;
  showTrailingIcon?: boolean;
  trailingIcon?: IconData;
  trailingIconColor?: string;
  /** null/undefined disables the button, as Flutter's `onPressed: null` does. */
  onPressed?: (() => void) | null;
  /** Replaces the default vertical 8 padding. */
  padding?: ViewStyle;
};

export function RoundedButton({
  title,
  buttonColor,
  buttonTitleColor,
  icon,
  iconColor,
  showTrailingIcon = false,
  trailingIcon,
  trailingIconColor,
  onPressed,
  padding,
}: Props) {
  const enabled = onPressed !== null && onPressed !== undefined;
  return (
    <View style={[styles.fill, padding ?? styles.defaultPadding]}>
      <MaterialPill
        color={enabled ? buttonColor ?? 'transparent' : kCartellLightGray}
        elevation={5}
        minWidth="stretch"
        height={45}
        onPress={enabled ? onPressed : undefined}
        accessibilityLabel={title}
      >
        <View style={styles.content}>
          {icon !== undefined && iconColor !== undefined && (
            <>
              <Icon icon={icon} color={iconColor} />
              <View style={styles.iconGap} />
            </>
          )}
          <Text
            style={[
              styles.title,
              textStyle(M3.labelLarge, { color: buttonTitleColor }),
            ]}
          >
            {title ?? ''}
          </Text>
          {showTrailingIcon && trailingIcon !== undefined && (
            <View style={styles.trailing}>
              <Icon icon={trailingIcon} color={trailingIconColor ?? 'white'} />
            </View>
          )}
        </View>
      </MaterialPill>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { alignSelf: 'stretch' },
  defaultPadding: { paddingVertical: 8 },
  content: {
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  iconGap: { width: 20 },
  title: { flexShrink: 1 },
  trailing: { paddingHorizontal: 15 },
});
