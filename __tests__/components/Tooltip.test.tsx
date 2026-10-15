// Flutter's Material Tooltip on the auth back button (material/tooltip.dart, raw_tooltip.dart,
// painting/geometry.dart positionDependentBox).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthBackButton } from '../../src/components/buttons/AuthBackButton';
import * as feedback from '../../src/services/feedback';
import {
  dismissTooltipForTouch,
  hideTooltip,
  isTooltipShowing,
  tooltipPosition,
  TooltipLayer,
  TooltipTouchListener,
} from '../../src/components/tooltip/Tooltip';

const screenSize = { width: 360, height: 800 };
const size = { width: 64, height: 32 };

describe('tooltipPosition (positionDependentBox, verticalOffset 24, margin 10)', () => {
  test('below the target centre, centred on it', () => {
    // FAB at (24, 59) 56 × 56: centre (52, 87)
    const target = { x: 24, y: 59, width: 56, height: 56 };
    expect(tooltipPosition(screenSize, size, target)).toEqual({
      x: 20,
      y: 111,
    });
  });

  test('kept 10 from the left edge', () => {
    const target = { x: 0, y: 59, width: 20, height: 20 };
    expect(tooltipPosition(screenSize, size, target).x).toBe(10);
  });

  test('above when it does not fit below', () => {
    const target = { x: 100, y: 760, width: 20, height: 20 };
    // centre 770; 770 − 24 − 32 = 714
    expect(tooltipPosition(screenSize, size, target).y).toBe(714);
  });
});

describe('AuthBackButton long press', () => {
  const metrics = {
    frame: { x: 0, y: 0, width: 360, height: 800 },
    insets: { top: 35, left: 0, right: 0, bottom: 44 },
  };

  beforeEach(() => {
    jest
      .spyOn(View.prototype as never, 'measureInWindow' as never)
      .mockImplementation(((cb: (...a: number[]) => void) =>
        cb(24, 59, 56, 56)) as never);
  });
  afterEach(async () => {
    await act(async () => hideTooltip());
  });

  async function renderButton(onPressed: () => void) {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <AuthBackButton onPressed={onPressed} />
        <TooltipLayer />
      </SafeAreaProvider>,
    );
  }

  test('a tap goes back and shows no tooltip', async () => {
    const onPressed = jest.fn();
    await renderButton(onPressed);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onPressed).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Back')).toBeNull();
  });

  test('a long press shows "Back" and does not go back', async () => {
    const onPressed = jest.fn();
    await renderButton(onPressed);
    const button = screen.getByRole('button', { name: 'Back' });
    await fireEvent(button, 'longPress');
    expect(screen.getByText('Back')).toBeTruthy();
    expect(onPressed).not.toHaveBeenCalled();
  });

  test('the tooltip is white at 0.9 with black 14 px text', async () => {
    await renderButton(jest.fn());
    await fireEvent(screen.getByRole('button', { name: 'Back' }), 'longPress');
    const label = screen.getByText('Back');
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({
      color: '#000000',
      fontSize: 14,
    });
    expect(StyleSheet.flatten(label.parent!.props.style)).toMatchObject({
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 4,
      minHeight: 32,
    });
  });

  test('a touch anywhere else hides it at once', async () => {
    await renderButton(jest.fn());
    await fireEvent(screen.getByRole('button', { name: 'Back' }), 'longPress');
    expect(isTooltipShowing()).toBe(true);
    await act(async () => dismissTooltipForTouch(200, 500));
    expect(isTooltipShowing()).toBe(false);
  });

  test('a touch on its own button leaves it to that press', async () => {
    await renderButton(jest.fn());
    await fireEvent(screen.getByRole('button', { name: 'Back' }), 'longPress');
    await act(async () => dismissTooltipForTouch(50, 80));
    expect(isTooltipShowing()).toBe(true);
  });

  test('that press hides it when it ends without a long press', async () => {
    await renderButton(jest.fn());
    const button = screen.getByRole('button', { name: 'Back' });
    await fireEvent(button, 'longPress');
    await fireEvent(button, 'pressOut');
    expect(isTooltipShowing()).toBe(true); // the first press: stays 1.5 s
    await fireEvent(button, 'pressOut');
    expect(isTooltipShowing()).toBe(false);
  });

  test('the long-press feedback plays only when the tooltip was not showing', async () => {
    const spy = jest.spyOn(feedback, 'forLongPress');
    await renderButton(jest.fn());
    const button = screen.getByRole('button', { name: 'Back' });
    await fireEvent(button, 'longPress');
    await fireEvent(button, 'longPress');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('the app-wide listener sees every touch first and never takes it', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <TooltipTouchListener>
          <AuthBackButton onPressed={jest.fn()} />
          <TooltipLayer />
        </TooltipTouchListener>
      </SafeAreaProvider>,
    );
    await fireEvent(screen.getByRole('button', { name: 'Back' }), 'longPress');
    let taken: unknown;
    await act(async () => {
      taken = await fireEvent(
        screen.getByTestId('tooltip-touch-listener'),
        'startShouldSetResponderCapture',
        { nativeEvent: { pageX: 200, pageY: 500 } },
      );
    });
    expect(taken).toBe(false);
    expect(isTooltipShowing()).toBe(false);
  });
});
