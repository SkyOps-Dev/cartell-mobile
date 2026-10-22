// Port of frontend/lib/screens/account/account_settings_skeleton.dart (spec 11 §1): Account
// Settings before its user and profile arrive. The same AppScaffold as the loaded screen (no ⋮
// menu, no Back handling of its own), so the app bar stays put while only the rows resolve.
//
// Expanded → SafeArea → padding h20 → Column(stretch):
//   padding v20 → "Account Settings" (20, centred, the ambient body style);
//   four rows, each padding v15: a 20 × 20 box, 20, an expanded 14-tall box (#54585A, radius 4);
//   Spacer; padding bottom 25 → a centred 24 × 24 spinner (stroke 2, blue).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScaffold } from '../../components/layout/AppScaffold';
import { SafeArea } from '../../components/layout/SafeArea';
import { CircularProgressIndicator } from '../../components/progress/CircularProgressIndicator';
import { kCartellBlue, kCartellDarkGray } from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';

// _rowCount = 4.
const ROWS = [0, 1, 2, 3];

export function AccountSettingsSkeleton() {
  return (
    <AppScaffold
      body={
        <SafeArea style={styles.expanded}>
          <View style={styles.column}>
            <View style={styles.titlePadding}>
              <Text style={titleStyle}>Account Settings</Text>
            </View>
            {ROWS.map(i => (
              <View key={i} style={styles.rowPadding}>
                <View style={styles.row}>
                  <View style={styles.square} />
                  <View style={styles.gap} />
                  <View style={styles.bar} />
                </View>
              </View>
            ))}
            <View style={styles.spacer} />
            <View style={styles.spinnerPadding}>
              <CircularProgressIndicator
                size={24}
                strokeWidth={2}
                color={kCartellBlue}
              />
            </View>
          </View>
        </SafeArea>
      }
    />
  );
}

const titleStyle = {
  ...toRN(merge(ambientTextStyle, { fontSize: 20 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { flex: 1, paddingHorizontal: 20 },
  titlePadding: { paddingVertical: 20 },
  rowPadding: { paddingVertical: 15 },
  row: { flexDirection: 'row', alignItems: 'center' },
  square: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: kCartellDarkGray,
  },
  gap: { width: 20 },
  bar: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    backgroundColor: kCartellDarkGray,
  },
  spacer: { flex: 1 },
  spinnerPadding: { paddingBottom: 25, alignItems: 'center' },
});
