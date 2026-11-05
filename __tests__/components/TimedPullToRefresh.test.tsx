// TimedPullToRefresh and the liquid_pull_to_refresh 3.0.1 port under it (spec 10 §2): pulled down
// from the top far enough, the band and the ring play in, onRefresh runs 2 s after the spring lands,
// and everything plays out; pulled less, or started below the top, nothing refreshes. Android's
// path: a pan alongside the list, half the finger's travel counting as the pull.

import React from 'react';
import { Platform, Text } from 'react-native';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { curveHillPath } from '../../src/components/liquidPullToRefresh/clipper';
import { TimedPullToRefresh } from '../../src/components/TimedPullToRefresh';

const animatedStyle = getAnimatedStyle as unknown as (
  component: unknown,
) => Record<string, unknown>;

const VIEWPORT = 400;
// Armed at a position of 2/3 × 254.5/255 of a quarter of the viewport, at half the finger's rate.
const ARMING_TRAVEL = 2 * VIEWPORT * 0.25 * (2 / 3) * (254.5 / 255);

beforeEach(() => {
  jest.useFakeTimers();
  jest.replaceProperty(Platform, 'OS', 'android');
});
afterEach(() => jest.useRealTimers());

async function show(onRefresh: () => Promise<void>) {
  await render(
    <GestureHandlerRootView>
      <TimedPullToRefresh onRefresh={onRefresh} testID="list">
        <Text>Content</Text>
      </TimedPullToRefresh>
    </GestureHandlerRootView>,
  );
  const list = screen.getByTestId('list');
  await fireEvent(list, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 360, height: VIEWPORT } },
  });
  await fireEvent(list, 'contentSizeChange', 360, 1000);
}

/** A finger: down, past the slop, then `travel` more, then up. */
async function pull(travel: number) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('liquid-pull-to-refresh'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 8 },
      { state: State.ACTIVE, translationY: 8 + travel / 2 },
      { state: State.ACTIVE, translationY: 8 + travel },
      { state: State.END, translationY: 8 + travel },
    ]);
  });
}

/**
 * The clock, one 16 ms frame at a time, as the phone draws: Reanimated's test runner does not start
 * an animation queued by another's end until the jump that finished the first is over.
 */
async function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(Math.min(16, ms - elapsed));
    });
  }
}

test('a pull past the arming point refreshes 2 s after the spring, then plays out', async () => {
  const onRefresh = jest.fn(async () => {});
  await show(onRefresh);
  await pull(ARMING_TRAVEL + 4);

  expect(screen.getByTestId('liquid-pull-to-refresh-band')).toBeTruthy();
  // The spring takes 1 s (springAnimationDurationInMilliseconds, not divided by the speed factor).
  await advance(1000);
  // Settled at 1/1.5: the band is 2/3 × 0.75 × 40 × 2 = 40 high.
  expect(
    animatedStyle(screen.getByTestId('liquid-pull-to-refresh-band')).height,
  ).toBeCloseTo(40, 0);
  await advance(1900);
  expect(onRefresh).not.toHaveBeenCalled();
  await advance(200);
  expect(onRefresh).toHaveBeenCalledTimes(1);

  // Played out: 200 ms (ring, indicator, peak), 40 ms (the last peak), 200 ms (the band); each
  // step starts on the next frame.
  expect(screen.getByTestId('liquid-pull-to-refresh-band')).toBeTruthy();
  await advance(500);
  expect(screen.queryByTestId('liquid-pull-to-refresh-band')).toBeNull();
});

test('a pull short of the arming point springs back without refreshing', async () => {
  const onRefresh = jest.fn(async () => {});
  await show(onRefresh);
  await pull(ARMING_TRAVEL - 4);
  expect(screen.getByTestId('liquid-pull-to-refresh-band')).toBeTruthy();
  await advance(250);
  expect(screen.queryByTestId('liquid-pull-to-refresh-band')).toBeNull();
  await advance(5000);
  expect(onRefresh).not.toHaveBeenCalled();
});

test('a pull that starts below the top of the list does nothing', async () => {
  const onRefresh = jest.fn(async () => {});
  await show(onRefresh);
  await fireEvent.scroll(screen.getByTestId('list'), {
    nativeEvent: {
      contentOffset: { x: 0, y: 120 },
      contentSize: { width: 360, height: 1000 },
      layoutMeasurement: { width: 360, height: VIEWPORT },
    },
  });
  await pull(ARMING_TRAVEL * 2);
  expect(screen.queryByTestId('liquid-pull-to-refresh-band')).toBeNull();
  await advance(5000);
  expect(onRefresh).not.toHaveBeenCalled();
});

test('pushing back up a list that can scroll ends the pull', async () => {
  const onRefresh = jest.fn(async () => {});
  await show(onRefresh);
  await act(async () => {
    fireGestureHandler(getByGestureTestId('liquid-pull-to-refresh'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 8 },
      { state: State.ACTIVE, translationY: 8 + ARMING_TRAVEL + 20 },
      { state: State.ACTIVE, translationY: 8 + ARMING_TRAVEL + 10 },
      { state: State.END, translationY: 8 + ARMING_TRAVEL + 10 },
    ]);
  });
  await advance(5000);
  expect(onRefresh).not.toHaveBeenCalled();
  expect(screen.queryByTestId('liquid-pull-to-refresh-band')).toBeNull();
});

describe('curveHillPath (CurveHillClipper)', () => {
  test('a rectangle while shorter than the centre height', () => {
    expect(curveHillPath(100, 30, 40, 20, 0, 0)).toBe(
      'M 0 0 L 0 30 L 100 30 L 100 0 Z',
    );
  });

  test('the curve never sags past the band', () => {
    expect(curveHillPath(100, 50, 40, 20, 0, 0)).toBe(
      'M 0 0 L 0 40 Q 25 50 50 50 Q 50 50 50 50 Q 50 50 50 50 Q 75 50 100 40 L 100 0 Z',
    );
  });

  test('a peak rises from the middle of the curve', () => {
    expect(curveHillPath(100, 60, 40, -5, 12, 14)).toBe(
      'M 0 0 L 0 40 Q 25 35 43 35 Q 46.5 23 50 23 Q 53.5 23 57 35 Q 75 35 100 40 L 100 0 Z',
    );
  });
});
