// Port of frontend/lib/components/forms/rounded_button.dart (spec 07 §7, §3.1).
//
// Padding (default vertical 8) → pill (elevation 5, buttonColor, or Gravel #A2AAAD when
// onPressed is null) → MaterialButton(minWidth 200, height 45) → Padding(5) →
// Row(centred)[icon, 20, Flexible(title), trailing icon (padding h15)].
// The title uses MaterialButton's labelLarge (14, w500, 0.1, ×1.43) in buttonTitleColor.
// Inside a parent that stretches (the auth screens), pass `stretch`.

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
  /** True when the parent Column uses crossAxisAlignment.stretch. */
  stretch?: boolean;
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
  stretch = false,
}: Props) {
  const enabled = onPressed !== null && onPressed !== undefined;
  return (
    <View style={padding ?? styles.defaultPadding}>
      <MaterialPill
        color={enabled ? buttonColor ?? 'transparent' : kCartellLightGray}
        elevation={5}
        minWidth={stretch ? 'stretch' : 200}
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
