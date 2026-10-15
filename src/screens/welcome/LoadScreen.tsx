// Port of frontend/lib/screens/welcome/load_screen.dart (spec 08 §1): shown while auto-login runs.
//
// Scaffold → AppBar (#25282A, the logo h45 as title) → SafeArea → ResponsiveSpacer → Center →
// SingleChildScrollView → Column: 20, SpinKitRing (white), 20. Nothing on it can be tapped.

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBar, AppBarLogo } from '../../components/layout/AppBar';
import { ResponsiveSpacer } from '../../components/layout/ResponsiveSpacer';
import { SafeArea } from '../../components/layout/SafeArea';
import { Scaffold } from '../../components/layout/Scaffold';
import { CenteredSingleChildScrollView } from '../../components/layout/CenteredSingleChildScrollView';
import { SpinKitRing } from '../../components/progress/SpinKitRing';
import { kCartellAppScaffoldColor } from '../../theme/colors';

export function LoadScreen() {
  return (
    <Scaffold
      appBar={
        <AppBar
          title={<AppBarLogo />}
          backgroundColor={kCartellAppScaffoldColor}
        />
      }
    >
      <SafeArea style={styles.fill}>
        <ResponsiveSpacer>
          <CenteredSingleChildScrollView>
            <View style={styles.column}>
              <View style={styles.gap} />
              <SpinKitRing color="#FFFFFF" />
              <View style={styles.gap} />
            </View>
          </CenteredSingleChildScrollView>
        </ResponsiveSpacer>
      </SafeArea>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { alignItems: 'center' },
  gap: { height: 20 },
});
