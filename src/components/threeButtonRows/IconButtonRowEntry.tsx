// Port of frontend/lib/components/three_button_rows/icon_button_row_entry.dart: one button of a
// hub's (or sensor's) grid of actions, a 40 icon over its label.
//
// A GestureDetector (translucent): no ink and no click sound. Disabled, the tap is still taken
// but does nothing, and the icon and label are dark gray (enabled: a Cartell-blue icon and a white
// label on the body text style).
//
// Layout: Padding(5 across, 20 down) → Column [Padding(10 across, 12 down) → icon, label
// (centred)]. The Column takes all the height it is given (MainAxisSize.max) with its children at
// the top, so in a grid cell the button is as tall as the cell, and only as wide as its widest
// child. Where the cell is shorter than the content (a 360-wide phone: 122.9 against 124) the label
// runs past the bottom by a pixel or so, as in Flutter.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  kCartellBlue,
  kCartellDarkGray,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, toRN } from '../../theme/typography';
import { Icon } from '../icons/Icon';
import type { IconData } from '../icons/iconData';

type Props = {
  isEnabled?: boolean;
  onTap: () => void;
  iconData: IconData;
  label: string;
};

export function IconButtonRowEntry({
  isEnabled = true,
  onTap,
  iconData,
  label,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isEnabled }}
      onPress={isEnabled ? onTap : () => {}}
      android_disableSound
      style={styles.entry}
    >
      <View style={styles.iconPadding}>
        <Icon
          icon={iconData}
          size={40}
          color={isEnabled ? kCartellBlue : kCartellDarkGray}
        />
      </View>
      <Text
        style={[
          labelText,
          { color: isEnabled ? MaterialColors.white : kCartellDarkGray },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const labelText = {
  ...toRN(ambientTextStyle),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  entry: {
    height: '100%',
    paddingHorizontal: 5,
    paddingVertical: 20,
    alignItems: 'center',
  },
  iconPadding: { paddingHorizontal: 10, paddingVertical: 12 },
});
