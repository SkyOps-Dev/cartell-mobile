// Flutter's `Center(child: SingleChildScrollView(child: …))`: the scroll view is as tall as its
// content and centred in the space it is given, shrinking and scrolling only when the content does
// not fit. Platform scroll physics never move content that fits, so iOS does not bounce it. When it
// does scroll, the Scaffold's app bar sees it (ScaffoldScrollView).

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScaffoldScrollView } from './ScaffoldScrollView';

export function CenteredSingleChildScrollView({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={styles.center}>
      <ScaffoldScrollView style={styles.scroll} alwaysBounceVertical={false}>
        {children}
      </ScaffoldScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  scroll: { flexGrow: 0 },
});
