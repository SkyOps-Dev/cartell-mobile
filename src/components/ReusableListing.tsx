// Port of frontend/lib/components/reusable_listing.dart (spec 11 §2): one Account Settings row.
//
// While the text-scale factor at 15 is at most 1.5: Row(spaceBetween, centred)[Row[icon, 20,
// label], 10, Flexible(value)]. Above that: the value under the label, left-aligned.
// - Text is the ambient body style (bodyMedium, onSurface) at `fontsize`. `fontcolor` is accepted
//   and ignored, as in Flutter (every caller passes white; the text is #E6E0E9).
// - GestureDetector with the default deferToChild: only the icon, the label and the value take
//   a tap, not the gaps between them. No ink and no click sound.
// LATER(part 36): above 1.5 the value sits in a Flexible inside a Column with unbounded height,
// which a release build lays out at its natural height; check against Flutter at large text.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ambientTextStyle, merge, toRN } from '../theme/typography';
import { useScalingFactor } from '../utilities/scaling';
import { Icon } from './icons/Icon';
import type { IconData } from './icons/iconData';

type Props = {
  listicon: IconData;
  iconcolor: string;
  iconsize: number;
  fontcolor?: string;
  fontsize: number;
  labelvalue: string;
  textvalue: string;
  onPress?: () => void;
};

export function ReusableListing({
  listicon,
  iconcolor,
  iconsize,
  fontsize,
  labelvalue,
  textvalue,
  onPress,
}: Props) {
  const scale = useScalingFactor(15);
  const text = {
    ...toRN(merge(ambientTextStyle, { fontSize: fontsize })),
    includeFontPadding: false,
  };
  // A tap target only where Flutter hit-tests a child.
  const tappable = (child: React.ReactNode) =>
    onPress === undefined ? (
      child
    ) : (
      <Pressable onPress={onPress} android_disableSound>
        {child}
      </Pressable>
    );

  const labelRow = (
    <View style={styles.labelRow}>
      {tappable(<Icon icon={listicon} color={iconcolor} size={iconsize} />)}
      <View style={styles.gap20} />
      {tappable(<Text style={text}>{labelvalue}</Text>)}
    </View>
  );
  const value = tappable(<Text style={text}>{textvalue}</Text>);

  if (scale <= 1.5) {
    return (
      <View style={styles.row}>
        {labelRow}
        <View style={styles.gap10} />
        <View style={styles.flexible}>{value}</View>
      </View>
    );
  }
  return (
    <View style={styles.column}>
      {labelRow}
      {value}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  column: { alignItems: 'flex-start', alignSelf: 'stretch' },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  gap20: { width: 20 },
  gap10: { width: 10 },
  flexible: { flexShrink: 1 },
});
