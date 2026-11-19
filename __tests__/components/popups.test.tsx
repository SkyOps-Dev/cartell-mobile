// Ported from frontend/test/components/popups_test.dart

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { TextButton } from '../../src/components/buttons/TextButton';
import {
  PopupHost,
  popPopup,
  PopupOptions,
  showAlertDialog,
  showPopupMessage,
} from '../../src/components/popups/popups';

async function openDialog(options: Partial<PopupOptions>) {
  await render(
    <PopupHost>
      <Text>screen</Text>
    </PopupHost>,
  );
  await act(async () => {
    showPopupMessage({ title: 'Title', message: 'Message', ...options });
  });
}

describe('showPopupMessage cancel inference', () => {
  afterEach(async () => {
    // Close anything left open so tests stay independent.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        popPopup();
        jest.runOnlyPendingTimers();
      });
    }
  });
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  test('a supplied cancelButtonLabel renders that button', async () => {
    await openDialog({ cancelButtonLabel: 'OK' });
    // A caller that names a cancel button expects to see it.
    expect(screen.getByText('OK')).toBeTruthy();
  });

  test('a supplied onCancel renders a cancel button', async () => {
    await openDialog({ onCancel: () => {} });
    // An onCancel handler is unreachable without a button.
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  test('onCancel fires when the inferred button is tapped', async () => {
    let cancelled = false;
    await openDialog({
      cancelButtonLabel: 'No thanks',
      onCancel: () => {
        cancelled = true;
      },
    });
    await fireEvent.press(screen.getByText('No thanks'));
    expect(cancelled).toBe(true);
  });

  test('a dialog with neither stays single-button', async () => {
    await openDialog({ okayButtonLabel: 'Got it' });
    expect(screen.getByText('Got it')).toBeTruthy();
    // Inference must not add a button to informational dialogs.
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  test('an explicit showCancel: false still suppresses the button', async () => {
    await openDialog({ cancelButtonLabel: 'OK', showCancel: false });
    expect(screen.queryByText('OK')).toBeNull();
  });

  test('an explicit showCancel: true still renders the button', async () => {
    await openDialog({ showCancel: true });
    expect(screen.getByText('Cancel')).toBeTruthy();
  });
});

describe('dialog layout (measured against Flutter on the RMX5070, 2026-10-14)', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());
  afterEach(async () => {
    await act(async () => {
      popPopup();
      jest.runOnlyPendingTimers();
    });
  });

  test('is centred inside the safe area, as showDialog’s useSafeArea', async () => {
    const { SafeAreaProvider } = require('react-native-safe-area-context');
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 800 },
          insets: { top: 35, left: 0, right: 0, bottom: 44 },
        }}
      >
        <PopupHost>
          <Text>screen</Text>
        </PopupHost>
      </SafeAreaProvider>,
    );
    await act(async () => {
      showPopupMessage({ title: 'Title', message: 'Message' });
    });
    const style = StyleSheet.flatten(
      screen.getByTestId('popup-inset').props.style,
    );
    expect(style).toMatchObject({
      paddingTop: 35 + 24,
      paddingBottom: 44 + 24,
      paddingLeft: 40,
      paddingRight: 40,
    });
  });

  test('an empty title and message each keep one line of their style’s height', async () => {
    await openDialog({ title: '', message: '' });
    const heights = screen
      .getAllByTestId('popup-empty-line')
      .map(line => StyleSheet.flatten(line.props.style).height);
    // Title: 20 × 1.43 (the dialog's bodyMedium height); message: 14 × 1.4.
    expect(heights).toEqual([20 * 1.43, 14 * 1.4]);
  });
});

describe('showAlertDialog (a plain AlertDialog: the firmware update’s errors)', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());
  afterEach(async () => {
    await act(async () => {
      popPopup();
      jest.runOnlyPendingTimers();
    });
  });

  async function openAlert(onOk = jest.fn()) {
    await render(
      <PopupHost>
        <Text>screen</Text>
      </PopupHost>,
    );
    await act(async () => {
      showAlertDialog({
        title: 'Lost contact',
        content: 'We lost contact with the hub.',
        backgroundColor: '#25282A',
        actions: (
          <TextButton label="OK" foregroundColor="#FFB500" onPressed={onOk} />
        ),
      });
      jest.runOnlyPendingTimers();
    });
    return onOk;
  }

  test('title in headlineSmall, content in bodyMedium, both onSurface', async () => {
    await openAlert();
    expect(
      StyleSheet.flatten(screen.getByText('Lost contact').props.style),
    ).toMatchObject({ fontSize: 24, fontWeight: '400', color: '#E6E0E9' });
    expect(
      StyleSheet.flatten(
        screen.getByText('We lost contact with the hub.').props.style,
      ),
    ).toMatchObject({ fontSize: 14, color: '#E6E0E9' });
  });

  test('the action’s label takes its foreground colour', async () => {
    await openAlert();
    expect(
      StyleSheet.flatten(screen.getByText('OK').props.style),
    ).toMatchObject({ color: '#FFB500' });
  });

  test('tapping the barrier closes it; the action runs its own handler', async () => {
    const onOk = await openAlert();
    await fireEvent(screen.getByTestId('popup-barrier'), 'responderRelease');
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.queryByText('Lost contact')).toBeNull();
    expect(onOk).not.toHaveBeenCalled();

    await openAlert(onOk);
    await fireEvent.press(screen.getByText('OK'));
    expect(onOk).toHaveBeenCalledTimes(1);
  });
});
