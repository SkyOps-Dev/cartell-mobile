// The shell's moving parts (spec 10 §1, spec 06 §7): the drawer's fling (AnimationController.fling
// with its critically damped spring), the page's Back rule (PopScope / ModalRoute.popDisposition),
// and the popup menu's size and place (_PopupMenu, _PopupMenuRouteLayout).

import React from 'react';
import { Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { flingCurve } from '../../src/components/layout/Drawer';
import {
  pressBackForTests,
  PopScope,
} from '../../src/components/layout/PopScope';
import {
  popMenu,
  PopupMenuButton,
  PopupMenuHost,
  PopupMenuItem,
} from '../../src/components/popups/PopupMenu';
import { FontAwesomeIcons } from '../../src/components/icons/iconData';
import { ListTile } from '../../src/components/lists/ListTile';

// Reanimated's getAnimatedStyle(component): its web-facing type declares no parameter.
const animatedStyle = getAnimatedStyle as unknown as (
  component: unknown,
) => Record<string, unknown>;

// A 360 × 800 phone, like the RMX5070 (the menu's place depends on the window's size).
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 800, scale: 3, fontScale: 1 }),
}));

describe('the drawer fling', () => {
  test('open() from closed reaches 1 after about 300 ms and never overshoots', () => {
    const { to, durationMs, easing } = flingCurve(0, 1);
    expect(to).toBe(1);
    // Solving (1.01 + 21.35t)·e^(−22.36t) = 0.01: just under 0.3 s.
    expect(durationMs).toBeGreaterThan(280);
    expect(durationMs).toBeLessThan(310);
    let last = 0;
    for (let i = 1; i <= 100; i++) {
      const value = easing(i / 100);
      expect(value).toBeGreaterThanOrEqual(last);
      expect(value).toBeLessThanOrEqual(1);
      last = value;
    }
    expect(easing(1)).toBeCloseTo(1, 2);
  });

  test('close() from open mirrors it down to 0', () => {
    const open = flingCurve(0, 1);
    const close = flingCurve(1, -1);
    expect(close.to).toBe(0);
    expect(close.durationMs).toBeCloseTo(open.durationMs, 0);
    expect(close.easing(0.5)).toBeCloseTo(open.easing(0.5), 5);
  });

  test('a fast fling from halfway arrives sooner than a resting one', () => {
    expect(flingCurve(0.5, 5).durationMs).toBeLessThan(
      flingCurve(0.5, 1).durationMs,
    );
  });

  test('open() when already open does nothing visible', () => {
    expect(flingCurve(1, 1).durationMs).toBeLessThan(20);
  });

  test('every easing it hands to withTiming is a worklet, including the already-there one', () => {
    // Reanimated warns "The easing function is not a worklet" otherwise (seen on the phone,
    // 2026-10-15, from a tap on the open drawer).
    for (const [from, velocity] of [
      [0, 1],
      [1, -1],
      [1, 1],
      [0, -1],
      [0.5, 5],
    ]) {
      const { easing } = flingCurve(from, velocity);
      expect(
        (easing as unknown as { __workletHash?: number }).__workletHash,
      ).toBeDefined();
    }
  });
});

describe('Back on the page', () => {
  test('with no PopScope the system takes it (the app goes to the background)', () => {
    expect(pressBackForTests()).toBe(false);
  });

  test('one PopScope with canPop false keeps it, and every PopScope hears about it', async () => {
    const outer = jest.fn();
    const inner = jest.fn();
    await render(
      <PopScope canPop={false} onPopInvoked={outer}>
        <PopScope canPop onPopInvoked={inner}>
          <Text>page</Text>
        </PopScope>
      </PopScope>,
    );
    expect(pressBackForTests()).toBe(true);
    expect(outer).toHaveBeenCalledWith(false);
    expect(inner).toHaveBeenCalledWith(false);
  });

  test('when every PopScope allows it, the system takes it', async () => {
    const onPop = jest.fn();
    await render(
      <PopScope canPop onPopInvoked={onPop}>
        <Text>page</Text>
      </PopScope>,
    );
    expect(pressBackForTests()).toBe(false);
    expect(onPop).not.toHaveBeenCalled();
  });
});

describe('the popup menu', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await act(async () => popMenu());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    jest.useRealTimers();
  });

  const layout = (width: number, height: number) => ({
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });

  async function openAt(x: number, naturalWidth: number) {
    jest
      .spyOn(View.prototype as never, 'measureInWindow' as never)
      .mockImplementation(((cb: (...a: number[]) => void) =>
        cb(x, 40, 48, 48)) as never);
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 800 },
          insets: { top: 36, left: 0, right: 0, bottom: 44 },
        }}
      >
        <PopupMenuButton
          icon={FontAwesomeIcons.ellipsisVertical}
          color="#CAC4D0"
          itemBuilder={() => [
            <PopupMenuItem key="a">
              <ListTile
                leadingIcon={FontAwesomeIcons.circlePlus}
                title="Add Hub"
              />
            </PopupMenuItem>,
          ]}
        />
        <PopupMenuHost />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByLabelText('Show menu'));
    await fireEvent(
      screen.getByTestId('popup-menu-measure', { includeHiddenElements: true }),
      'layout',
      layout(naturalWidth, 56),
    );
    const content = screen.getByTestId('popup-menu-content');
    await fireEvent(
      content,
      'layout',
      layout(content.props.style[1].width, 72),
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    return screen.getByTestId('popup-menu-content');
  }

  test('its width is the widest item rounded up to 56s: 119 → 168 (as measured on Flutter)', async () => {
    const content = await openAt(312, 119);
    expect(content.props.style[1]).toEqual({ width: 168 });
  });

  test('never narrower than 112', async () => {
    const content = await openAt(312, 30);
    expect(content.props.style[1]).toEqual({ width: 112 });
  });

  test('never wider than 280', async () => {
    const content = await openAt(312, 400);
    expect(content.props.style[1]).toEqual({ width: 280 });
  });

  test('fully open: 168 × 72 at (184, statusBar + 8), as on the Flutter Hubs screen', async () => {
    const content = await openAt(312, 119);
    const material = content.parent!;
    expect(animatedStyle(material)).toMatchObject({
      left: 184,
      top: 44,
      width: 168,
      height: 72,
      opacity: 1,
    });
  });

  test('a tap outside closes it', async () => {
    await openAt(312, 119);
    expect(screen.getByText('Add Hub')).toBeTruthy();
    await act(async () => popMenu());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(screen.queryByText('Add Hub')).toBeNull();
  });
});
