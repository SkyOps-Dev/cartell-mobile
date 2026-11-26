// The Material 3 AppBar's "scrolled under" colour (material/app_bar.dart, Flutter 3.41.9): while
// the Scaffold's scroll view is scrolled off its top, the bar is the theme's surface tint at 8%
// over its colour; back at the top it is its own colour again. Measured on the Flutter app
// (RMX5070, 2026-11-26, Account Settings): #25282A at the top, #32343B scrolled.
//
// The UI-thread path (ScaffoldScrollView, RevealingScrollView) does not run under Reanimated's
// Jest mock; the pull-to-refresh list's JS path sets the same flag, so it drives these tests.

import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBar } from '../../src/components/layout/AppBar';
import { Scaffold } from '../../src/components/layout/Scaffold';
import { isScrolledUnder } from '../../src/components/layout/scrolledUnder';
import { TimedPullToRefresh } from '../../src/components/TimedPullToRefresh';
import {
  applySurfaceTint,
  ColorScheme,
  kCartellAppScaffoldColor,
} from '../../src/theme/colors';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

/** The colour of the nearest view around the title that has one: the bar's. */
function barColor(): unknown {
  let node: ReturnType<typeof screen.getByText> | null =
    screen.getByText('Title');
  while (node) {
    const color = StyleSheet.flatten(node.props.style)?.backgroundColor;
    if (color !== undefined) return color;
    node = node.parent;
  }
  return undefined;
}

describe('applySurfaceTint (ElevationOverlay.applySurfaceTint)', () => {
  test('the app bar colour at elevation 3 is the colour measured on Flutter', () => {
    expect(applySurfaceTint('#25282A', ColorScheme.surfaceTint, 3)).toBe(
      '#32343B',
    );
  });

  test('elevation 0 leaves the colour as it is', () => {
    expect(applySurfaceTint('#25282A', ColorScheme.surfaceTint, 0)).toBe(
      '#25282A',
    );
  });

  test('between table entries the opacity is interpolated, then rounded to a whole alpha', () => {
    // Elevation 2: 0.05 + (0.08 − 0.05) / 2 = 0.065 → alpha round(16.575) = 17.
    // Blue: 17/255 × 255 + 238/255 × 0 = 17.
    expect(applySurfaceTint('#000000', '#0000FF', 2)).toBe('#000011');
  });

  test('past the last entry the opacity stays at 14%', () => {
    // round(0.14 × 255) = 36 = 0x24.
    expect(applySurfaceTint('#000000', '#0000FF', 24)).toBe('#000024');
  });
});

test('isScrolledUnder: any content above the viewport, never an iOS bounce at the top', () => {
  expect(isScrolledUnder(0)).toBe(false);
  expect(isScrolledUnder(-30)).toBe(false);
  expect(isScrolledUnder(0.5)).toBe(true);
  expect(isScrolledUnder(400)).toBe(true);
});

describe('AppBar over a scrolling list', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  async function show() {
    await render(
      <GestureHandlerRootView>
        <SafeAreaProvider initialMetrics={metrics}>
          <Scaffold
            appBar={
              <AppBar
                title={<Text>Title</Text>}
                backgroundColor={kCartellAppScaffoldColor}
              />
            }
          >
            <TimedPullToRefresh onRefresh={async () => {}} testID="list">
              <Text>Content</Text>
            </TimedPullToRefresh>
          </Scaffold>
        </SafeAreaProvider>
      </GestureHandlerRootView>,
    );
  }

  async function scrollTo(y: number) {
    await fireEvent.scroll(screen.getByTestId('list'), {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 360, height: 2000 },
        layoutMeasurement: { width: 360, height: 600 },
      },
    });
  }

  test('starts in its own colour', async () => {
    await show();
    expect(barColor()).toBe('#25282A');
  });

  test('tints as soon as the list leaves its top, and clears back at the top', async () => {
    await show();
    await scrollTo(1);
    expect(barColor()).toBe('#32343B');
    await scrollTo(300);
    expect(barColor()).toBe('#32343B');
    await scrollTo(0);
    expect(barColor()).toBe('#25282A');
  });

  test('an iOS bounce past the top does not tint it', async () => {
    await show();
    await scrollTo(-40);
    expect(barColor()).toBe('#25282A');
  });
});

test('an AppBar outside any Scaffold keeps its colour', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AppBar title={<Text>Title</Text>} backgroundColor="#25282A" />
    </SafeAreaProvider>,
  );
  expect(barColor()).toBe('#25282A');
});
