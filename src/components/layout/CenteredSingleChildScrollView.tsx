// Flutter's `Center(child: SingleChildScrollView(child: …))`: the scroll view is as tall as its
// content and centred in the space it is given, shrinking and scrolling only when the content does
// not fit. Platform scroll physics never move content that fits, so iOS does not bounce it.

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export function CenteredSingleChildScrollView({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={styles.center}>
      <ScrollView style={styles.scroll} alwaysBounceVertical={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  scroll: { flexGrow: 0 },
});
