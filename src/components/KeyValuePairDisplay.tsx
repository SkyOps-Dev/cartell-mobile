// Port of frontend/lib/components/key_value_pair_display.dart: a label and its value on one row
// (the label at the left, the value at the right), padded 15 down and 20 across, both `fontSize`
// (14 by default) on the body text style.
//
// When the text-scale factor at 14 is 1.5 or more, the pair stacks instead: the label (14, light
// gray) over the value, both at the left.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { kCartellLightGray } from '../theme/colors';
import { ambientTextStyle, merge, toRN } from '../theme/typography';
import { useScalingFactor } from '../utilities/scaling';

type Props = {
  keyStr: string;
  valueStr: string;
  fontSize?: number;
};

export function KeyValuePairDisplay({
  keyStr,
  valueStr,
  fontSize = 14,
}: Props) {
  const scale = useScalingFactor(14);
  const text = {
    ...toRN(merge(ambientTextStyle, { fontSize })),
    textAlign: 'center' as const,
    includeFontPadding: false,
  };
  if (scale < 1.5) {
    return (
      <View style={[styles.padding, styles.row]}>
        <Text style={text}>{keyStr}</Text>
        <Text style={text}>{valueStr}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.padding, styles.column]}>
      <Text style={stackedKey}>{keyStr}</Text>
      <Text style={text}>{valueStr}</Text>
    </View>
  );
}

const stackedKey = {
  ...toRN(merge(ambientTextStyle, { fontSize: 14, color: kCartellLightGray })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  padding: { paddingVertical: 15, paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  column: { alignItems: 'flex-start' },
});
