// Ported from frontend/test/screens/welcome/maintenance_mode_screen_test.dart.

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FontAwesomeIcons } from '../../src/components/icons/iconData';
import { MaintenanceModeScreen } from '../../src/screens/welcome/MaintenanceModeScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const UNREACHABLE =
  "We can't reach Cartell right now.\nCheck your internet connection and try again.";
const MAINTENANCE =
  'The server is currently undergoing an update. Please check back later.';

const mount = (props: React.ComponentProps<typeof MaintenanceModeScreen>) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MaintenanceModeScreen {...props} />
    </SafeAreaProvider>,
  );

const glyph = (codePoint: number) => String.fromCodePoint(codePoint);
// Icons are hidden from screen readers (no semanticLabel), as in Flutter.
const hidden = { includeHiddenElements: true };

describe('MaintenanceModeScreen — copy selection', () => {
  test('defaults to the maintenance copy when isUnreachable is not set', async () => {
    await mount({});
    expect(screen.getByText(MAINTENANCE)).toBeTruthy();
    expect(
      screen.getByText(glyph(FontAwesomeIcons.wrench.codePoint), hidden),
    ).toBeTruthy();
  });

  test('shows the maintenance copy when isUnreachable is false', async () => {
    await mount({ isUnreachable: false });
    expect(screen.getByText(MAINTENANCE)).toBeTruthy();
    expect(
      screen.queryByText(glyph(FontAwesomeIcons.wifi.codePoint), hidden),
    ).toBeNull();
  });

  test('shows an unreachable-specific message when isUnreachable is true', async () => {
    await mount({ isUnreachable: true });
    expect(screen.getByText(UNREACHABLE)).toBeTruthy();
    expect(screen.queryByText(MAINTENANCE)).toBeNull();
    expect(
      screen.getByText(glyph(FontAwesomeIcons.wifi.codePoint), hidden),
    ).toBeTruthy();
    expect(
      screen.queryByText(glyph(FontAwesomeIcons.wrench.codePoint), hidden),
    ).toBeNull();
  });
});

describe('MaintenanceModeScreen — layout', () => {
  test('the message is centred, 20 px', async () => {
    await mount({ isUnreachable: true });
    expect(
      StyleSheet.flatten(screen.getByText(UNREACHABLE).props.style),
    ).toMatchObject({ textAlign: 'center', fontSize: 20 });
  });
});

describe('MaintenanceModeScreen — retry', () => {
  test('offers a retry control when unreachable', async () => {
    await mount({ isUnreachable: true, onRetry: () => {} });
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  test('tapping retry invokes the callback', async () => {
    const onRetry = jest.fn();
    await mount({ isUnreachable: true, onRetry });
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('offers retry in maintenance mode too', async () => {
    await mount({ isUnreachable: false, onRetry: () => {} });
    expect(screen.getByText('Retry')).toBeTruthy();
  });
});
