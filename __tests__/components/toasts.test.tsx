// showToastPopup and the toastification behaviour it relies on (popups.dart, toastification
// 2.3.0): when a toast appears, how long it stays, one at a time, and the close button.

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FontAwesomeIcons, Icons } from '../../src/components/icons/iconData';
import {
  resetToastsForTests,
  showFailedToastPopup,
  showSuccessfulToastPopup,
  ToastHost,
} from '../../src/components/popups/toasts';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

beforeEach(async () => {
  jest.useFakeTimers();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastHost>
        <Text>screen</Text>
      </ToastHost>
    </SafeAreaProvider>,
  );
});

afterEach(async () => {
  await act(async () => {
    resetToastsForTests();
    // Let the overlay-removal timers of dismissed toasts run out.
    await jest.advanceTimersByTimeAsync(1000);
  });
  jest.useRealTimers();
});

const advance = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

test('the first toast appears after 100 ms (the overlay is made first)', async () => {
  await act(async () => showSuccessfulToastPopup('Notifications turned on.'));
  await advance(99);
  expect(screen.queryByText('Notifications turned on.')).toBeNull();
  await advance(1);
  expect(screen.getByText('Notifications turned on.')).toBeTruthy();
});

test('it closes itself 5 s after it was made, then animates out over 600 ms', async () => {
  await act(async () => showSuccessfulToastPopup('Saved.'));
  await advance(4999);
  expect(screen.getByText('Saved.')).toBeTruthy();
  await advance(1 + 599);
  expect(screen.getByText('Saved.')).toBeTruthy();
  await advance(1);
  expect(screen.queryByText('Saved.')).toBeNull();
});

test('a new toast closes the open one; it appears 10 ms later while the overlay exists', async () => {
  await act(async () => showSuccessfulToastPopup('first'));
  await advance(100);
  await act(async () => showFailedToastPopup('second'));
  await advance(10);
  expect(screen.getByText('second')).toBeTruthy();
  // The first one is on its way out.
  await advance(600);
  expect(screen.queryByText('first')).toBeNull();
  expect(screen.getByText('second')).toBeTruthy();
});

test('success shows circleCheck, failure error_outline, both white on #54585A', async () => {
  await act(async () => showSuccessfulToastPopup('ok'));
  await advance(100);
  const check = screen.getByText(
    String.fromCodePoint(FontAwesomeIcons.circleCheck.codePoint),
    { includeHiddenElements: true },
  );
  expect(check).toHaveStyle({ color: '#FFFFFF', fontSize: 24 });

  await act(async () => showFailedToastPopup('bad'));
  await advance(10);
  expect(
    screen.getByText(String.fromCodePoint(Icons.error_outline.codePoint), {
      includeHiddenElements: true,
    }),
  ).toBeTruthy();
  const box = screen.getByText('bad').parent!.parent!.parent!;
  expect(StyleSheet.flatten(box.props.style)).toMatchObject({
    backgroundColor: '#54585A',
    borderColor: '#EBEBEB',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 64,
  });
});

test('the message shows at most two lines (14 × 1.2 each); the rest is cut off', async () => {
  await act(async () => showFailedToastPopup('a long message'));
  await advance(100);
  const text = screen.getByText('a long message');
  expect(text).toHaveStyle({
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 16.8,
    color: '#FFFFFF',
  });
  expect(StyleSheet.flatten(text.parent!.props.style)).toMatchObject({
    maxHeight: 33.6,
    overflow: 'hidden',
  });
});

test('the close button closes it, animated', async () => {
  await act(async () => showSuccessfulToastPopup('closable'));
  await advance(100);
  const close = screen.getByText(String.fromCodePoint(Icons.close.codePoint), {
    includeHiddenElements: true,
  });
  await fireEvent.press(close);
  await advance(599);
  expect(screen.getByText('closable')).toBeTruthy();
  await advance(1);
  expect(screen.queryByText('closable')).toBeNull();
});
