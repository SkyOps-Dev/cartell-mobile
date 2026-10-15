// The keyboard handling Flutter's Scaffold, SafeArea and EditableText give the auth screens.
// On a device the inset arrives frame by frame from react-native-keyboard-controller; here the
// handler the Scaffold registers is captured and driven by hand.

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import * as Reanimated from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { offsetToReveal } from '../../src/components/layout/RevealingScrollView';
import {
  SafeArea,
  safeBottomPadding,
} from '../../src/components/layout/SafeArea';
import {
  Scaffold,
  WhenKeyboardHidden,
} from '../../src/components/layout/Scaffold';

type Frame = {
  height: number;
  progress: number;
  duration: number;
  target: number;
};
type Handler = { onMove?: (e: Frame) => void; onEnd?: (e: Frame) => void };

const frame = (height: number): Frame => ({
  height,
  progress: height > 0 ? 1 : 0,
  duration: 250,
  target: 1,
});

function lastHandler(): Handler {
  const calls = (useKeyboardHandler as jest.Mock).mock.calls;
  return calls[calls.length - 1][0];
}

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 44 },
};

describe('offsetToReveal (EditableText._scheduleShowCaretOnScreen)', () => {
  const field = {
    fieldY: 600,
    fieldHeight: 48,
    lineHeight: 24,
    viewportHeight: 400,
    contentHeight: 1000,
  };

  test('Android shows the line with 39 below it, scrolling as little as possible', () => {
    // line 612–636; 636 + 39 = 675; 675 − 400 = 275
    expect(offsetToReveal({ ...field, offset: 0, os: 'android' })).toBe(275);
  });

  test('iOS keeps 20 below a caret 1 taller than the line', () => {
    // 636 + 1 + 20 = 657; 657 − 400 = 257
    expect(offsetToReveal({ ...field, offset: 0, os: 'ios' })).toBe(257);
  });

  test('a field above the viewport scrolls back to 20 above its line', () => {
    expect(offsetToReveal({ ...field, offset: 700, os: 'android' })).toBe(592);
  });

  test('a field already in view does not move the scroll', () => {
    expect(offsetToReveal({ ...field, offset: 300, os: 'android' })).toBe(300);
  });

  test('never scrolls past the end of the content', () => {
    expect(
      offsetToReveal({
        ...field,
        contentHeight: 500,
        offset: 0,
        os: 'android',
      }),
    ).toBe(100);
  });
});

describe('SafeArea (Flutter MediaQuery.padding)', () => {
  test('the keyboard takes over the bottom padding', () => {
    expect(safeBottomPadding(44, 0)).toBe(44);
    expect(safeBottomPadding(44, 20)).toBe(24);
    expect(safeBottomPadding(44, 299)).toBe(0);
  });
});

describe('Scaffold (resizeToAvoidBottomInset)', () => {
  beforeEach(() => (useKeyboardHandler as jest.Mock).mockClear());

  async function renderScreen() {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Scaffold>
          <SafeArea>
            <WhenKeyboardHidden>
              <Text>logo</Text>
            </WhenKeyboardHidden>
            <Text>content</Text>
          </SafeArea>
        </Scaffold>
      </SafeAreaProvider>,
    );
  }
  // Animated styles live outside the React props; Reanimated's Jest helper reads the current
  // one (its published type is the web build's, which takes no argument).
  type Padding = { paddingTop?: number; paddingBottom?: number };
  const animatedStyle = Reanimated.getAnimatedStyle as unknown as (
    node: unknown,
  ) => Padding;
  const safeArea = () => animatedStyle(screen.getByText('content').parent!);
  const body = () => animatedStyle(screen.getByText('content').parent!.parent!);

  test('follows the keyboard: body above it, safe-area padding handed over', async () => {
    await renderScreen();
    expect(body().paddingBottom).toBe(0);
    expect(
      StyleSheet.flatten(screen.getByText('content').parent!.props.style)
        .paddingTop,
    ).toBe(47);
    expect(safeArea().paddingBottom).toBe(44);

    await act(async () => lastHandler().onMove!(frame(299)));
    expect(body().paddingBottom).toBe(299);
    expect(safeArea().paddingBottom).toBe(0);

    await act(async () => lastHandler().onEnd!(frame(0)));
    expect(body().paddingBottom).toBe(0);
    expect(safeArea().paddingBottom).toBe(44);
  });

  test('hides "viewInsets.bottom <= 0" content from the first keyboard frame to the last', async () => {
    await renderScreen();
    expect(screen.getByText('logo')).toBeTruthy();

    await act(async () => lastHandler().onMove!(frame(3)));
    expect(screen.queryByText('logo')).toBeNull();

    await act(async () => lastHandler().onMove!(frame(1)));
    expect(screen.queryByText('logo')).toBeNull();

    await act(async () => lastHandler().onMove!(frame(0)));
    expect(screen.getByText('logo')).toBeTruthy();
  });
});
