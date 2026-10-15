// Port of frontend/lib/components/env_banner.dart (spec 02 §4).
//
// A red "<ENV> SERVER" tag in the top-right corner of every screen on non-LIVE builds. It sits
// above everything, never takes touches, and repaints when the Debug menu switches environment.
// The tree shape is the same in every environment, so the app below keeps its state on a switch.
//
// Popups must be drawn inside this tree (not with React Native's <Modal>, which opens a separate
// native window) or they would cover the tag, which in Flutter stays on top of dialogs.

import React, { useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';

import {
  getEnvironmentName,
  subscribeToEnvironmentName,
} from '../config/environment';
import { FakeBoldText } from './text/FakeBoldText';

// Colors.red (#F44336) at alpha 0.85.
const BANNER_RED = 'rgba(244, 67, 54, 0.85)';

// Q46: the Flutter tag inherits MaterialApp's fallback text style, so it is monospace with a
// yellow double underline. Measured on the Flutter app (RMX5070, 2026-10-13; PARITY_ISSUES P1):
// - Underlines: each 1.75 physical px thick, anti-aliased over three pixel rows, the first from
//   32.5 px below the top of the text, the second 3 dp lower (SkParagraph's double-decoration
//   spacing), overhanging the text box into the padding. React Native cannot draw a double or
//   coloured underline, and a View snaps to whole pixels, so they are drawn with SVG.
// - Weight: the font has no bold face, so Flutter fakes bold; FakeBoldText draws it as Skia does.
const UNDERLINE_COLOR = '#FFFF00';
const UNDERLINE_TOP = 32.5 / 3;
const UNDERLINE_THICKNESS = 1.75 / 3;
const DOUBLE_UNDERLINE_SPACING = 3;
const UNDERLINE_BOX_HEIGHT = 20;

export function EnvBanner({ children }: { children: React.ReactNode }) {
  const environmentName = useSyncExternalStore(
    subscribeToEnvironmentName,
    getEnvironmentName,
  );
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {children}
      {environmentName !== 'LIVE' && (
        <View
          pointerEvents="none"
          style={[styles.position, { top: insets.top, right: insets.right }]}
        >
          <View style={styles.box}>
            <View>
              <FakeBoldText
                style={styles.label}
                enabled={Platform.OS === 'android'}
              >
                {`${environmentName} SERVER`}
              </FakeBoldText>
              <Svg
                style={styles.underlines}
                width="100%"
                height={UNDERLINE_BOX_HEIGHT}
              >
                <Rect
                  x={0}
                  y={UNDERLINE_TOP}
                  width="100%"
                  height={UNDERLINE_THICKNESS}
                  fill={UNDERLINE_COLOR}
                />
                <Rect
                  x={0}
                  y={UNDERLINE_TOP + DOUBLE_UNDERLINE_SPACING}
                  width="100%"
                  height={UNDERLINE_THICKNESS}
                  fill={UNDERLINE_COLOR}
                />
              </Svg>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  position: { position: 'absolute' },
  box: {
    backgroundColor: BANNER_RED,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 1.1,
    // Flutter's 'monospace' on Android is /system/fonts/DroidSansMono.ttf, which Flutter reads
    // directly. Asking Android for "monospace" is not the same: on realme UI (RMX5070) it returned
    // the phone's theme sans font. So the same file ships in assets/fonts. It has no bold face and
    // Flutter draws it regular (not thickened), so no bold here either. What iOS falls back to is
    // unverified; check against an iOS reference.
    fontFamily: Platform.OS === 'android' ? 'DroidSansMono' : undefined,
    // Bold is drawn by hand on Android (FakeBoldText); elsewhere the platform's bold.
    fontWeight: Platform.OS === 'android' ? 'normal' : 'bold',
    // Flutter's line box is the font's own ascent + descent, without Android's extra padding.
    includeFontPadding: false,
  },
  underlines: { position: 'absolute', left: 0, top: 0 },
});
