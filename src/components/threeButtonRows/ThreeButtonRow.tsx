// Port of frontend/lib/components/three_button_rows/three_button_row.dart: a sensor's three
// actions (Find Sensor or Set Location, View History, About).
//
// While the scaling factor at 14 is under 1.5: a Row (spaceAround, children centred across), each
// child Padding(5 across) → at most 70 wide (so a two-word label wraps). At 1.5 or more: a Column
// (as tall as its children) with each child Padding(10 down and up).

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useScalingFactor } from '../../utilities/scaling';

export function ThreeButtonRow({ children }: { children: React.ReactNode[] }) {
  const isLargeTextSize = useScalingFactor(14) < 1.5;
  if (isLargeTextSize) {
    return (
      <View style={styles.row}>
        {children.map((child, index) => (
          <View key={index} style={styles.rowChild}>
            {child}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.column}>
      {children.map((child, index) => (
        <View key={index} style={styles.columnChild}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rowChild: { paddingHorizontal: 5, maxWidth: 70 + 10 },
  column: { alignItems: 'center' },
  columnChild: { paddingVertical: 10 },
});
