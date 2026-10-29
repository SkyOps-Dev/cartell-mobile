// Loading screen: load_screen.dart, SpinKitRing (flutter_spinkit 5.2.2) and the app bar.

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ringArcAt } from '../../src/components/progress/SpinKitRing';
import { LoadScreen } from '../../src/screens/welcome/LoadScreen';
import { estimateBrightnessForColor } from '../../src/theme/colors';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 30, left: 0, right: 0, bottom: 44 },
};

describe('LoadScreen', () => {
  test('a #25282A app bar under the status bar, and one spinner', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <LoadScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    type Node = {
      props: { style?: Parameters<typeof StyleSheet.flatten>[0] };
      children?: unknown[] | null;
    };
    const styles: Record<string, unknown>[] = [];
    const walk = (node: unknown) => {
      if (node && typeof node === 'object' && 'props' in node) {
        styles.push(StyleSheet.flatten((node as Node).props.style) ?? {});
        ((node as Node).children ?? []).forEach(walk);
      }
    };
    walk(screen.toJSON());
    const bar = styles.find(style => style.backgroundColor === '#25282A');
    expect(bar?.paddingTop).toBe(30);
  });

  test('the app bar asks for light status bar icons', async () => {
    const setBarStyle = jest.spyOn(StatusBar, 'setBarStyle');
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <LoadScreen />
      </SafeAreaProvider>,
    );
    expect(setBarStyle).toHaveBeenCalledWith('light-content');
  });
});

describe('estimateBrightnessForColor', () => {
  test('matches ThemeData.estimateBrightnessForColor', () => {
    expect(estimateBrightnessForColor('#25282A')).toBe('dark');
    expect(estimateBrightnessForColor('#0A0E21')).toBe('dark');
    expect(estimateBrightnessForColor('#FFFFFF')).toBe('light');
    expect(estimateBrightnessForColor('#FFB500')).toBe('light');
  });
});

describe('SpinKitRing motion', () => {
  const turn = 2 * Math.PI;
  const mod = (a: number) => ((a % turn) + turn) % turn;

  test('starts at −120° with a quarter sweep', () => {
    const { start, sweep } = ringArcAt(0);
    expect(start).toBeCloseTo((-2 / 3) * Math.PI);
    expect(sweep).toBeCloseTo(turn * 0.25);
  });

  test('the sweep peaks at 5/6 of a turn half way through', () => {
    const { start, sweep } = ringArcAt(600);
    expect(sweep).toBeCloseTo(turn * (5 / 6));
    // rotation 75° plus the start fraction still at −2/3 π
    expect(start).toBeCloseTo((5 * Math.PI) / 12 - (2 / 3) * Math.PI);
  });

  test('the cycle wraps without a jump', () => {
    const end = ringArcAt(1199.999);
    const next = ringArcAt(1200);
    expect(mod(end.start)).toBeCloseTo(mod(next.start), 3);
    expect(end.sweep).toBeCloseTo(next.sweep, 3);
  });
});
