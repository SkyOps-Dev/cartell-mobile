// The Material 3 Switch port (switch.dart, toggleable.dart): its geometry and colours at rest, the
// slide when the value changes, and how a tap and a drag reach onChanged.

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { Switch } from '../../src/components/forms/Switch';

const animatedStyle = getAnimatedStyle as unknown as (
  node: unknown,
) => Record<string, unknown>;

const AMBER = '#FFB500';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function renderSwitch(value: boolean, onChanged = jest.fn()) {
  const view = await render(
    <Switch value={value} onChanged={onChanged} activeThumbColor={AMBER} />,
  );
  const box = screen.getByRole('switch');
  const [track, reaction, thumb] = box.children as unknown[];
  return { view, box, track, reaction, thumb, onChanged };
}

describe('at rest', () => {
  test('off: a 16 thumb in #938F99 at the left of a #36343B track with a #938F99 outline', async () => {
    const { box, track, thumb } = await renderSwitch(false);
    expect(box).toHaveStyle({ width: 60, height: 48 });
    expect(animatedStyle(thumb)).toMatchObject({
      left: 12,
      top: 16,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: 'rgba(147, 143, 153, 1)',
    });
    expect(animatedStyle(track)).toMatchObject({
      backgroundColor: 'rgba(54, 52, 59, 1)',
      borderColor: 'rgba(147, 143, 153, 1)',
    });
  });

  test('on: a 24 amber thumb at the right; the track is amber at alpha 0x80, no outline', async () => {
    const { track, thumb } = await renderSwitch(true);
    expect(animatedStyle(thumb)).toMatchObject({
      left: 28,
      top: 12,
      width: 24,
      height: 24,
      backgroundColor: 'rgba(255, 181, 0, 1)',
    });
    expect(animatedStyle(track)).toMatchObject({
      backgroundColor: `rgba(255, 181, 0, ${128 / 255})`,
      borderColor: 'rgba(0, 0, 0, 0)',
    });
  });

  test('announces itself as a switch with its state', async () => {
    const { box } = await renderSwitch(true);
    expect(box.props.accessibilityState).toEqual({ checked: true });
  });
});

test('a new value slides the thumb over 300 ms, overshooting on the way (easeOutBack)', async () => {
  const { view, thumb } = await renderSwitch(false);
  await view.rerender(
    <Switch value onChanged={jest.fn()} activeThumbColor={AMBER} />,
  );
  const lefts: number[] = [];
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(16);
    });
    const { left, width } = animatedStyle(thumb) as {
      left: number;
      width: number;
    };
    lefts.push(left + width / 2);
  }
  await act(async () => {
    await jest.advanceTimersByTimeAsync(200);
  });
  // The thumb's centre goes from 20 to 40, passing 40 before it settles.
  expect(Math.max(...lefts)).toBeGreaterThan(40);
  expect(animatedStyle(thumb)).toMatchObject({ left: 28, width: 24 });
});

// --- gestures ----------------------------------------------------------------------------

let now = 0;
let last = { x: 0, y: 0 };
/**
 * A touch at (x, y), each one later than the last: PanResponder only counts moves newer than
 * those it has seen, and adds up current − previous. A touch at (0, 0) starts a new gesture.
 */
function touchEvent(x: number, y = 0) {
  now += 16;
  const previous = x === 0 && y === 0 ? { x, y } : last;
  last = { x, y };
  return {
    nativeEvent: {
      pageX: x,
      pageY: y,
      timestamp: now,
      touches: [],
      changedTouches: [],
    },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: now,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: 0,
          startTimeStamp: 0,
          currentPageX: x,
          currentPageY: y,
          currentTimeStamp: now,
          previousPageX: previous.x,
          previousPageY: previous.y,
          previousTimeStamp: now - 16,
        },
      ],
    },
  };
}

type Handlers = {
  onResponderGrant: (e: unknown) => void;
  onResponderMove: (e: unknown) => void;
  onResponderRelease: (e: unknown) => void;
};

test('a tap flips the value through onChanged', async () => {
  const { box, onChanged } = await renderSwitch(false);
  const handlers = box.props as Handlers;
  await act(async () => {
    handlers.onResponderGrant(touchEvent(0));
    handlers.onResponderRelease(touchEvent(0));
  });
  expect(onChanged).toHaveBeenCalledWith(true);
});

test('pressing past 100 ms shows the press: the off thumb grows towards 28', async () => {
  const { box, thumb } = await renderSwitch(false);
  const handlers = box.props as Handlers;
  await act(async () => {
    handlers.onResponderGrant(touchEvent(0));
    await jest.advanceTimersByTimeAsync(250);
  });
  expect(animatedStyle(thumb)).toMatchObject({ width: 28, height: 28 });
});

test('a quick tap leaves no press behind: the thumb settles back to 16', async () => {
  // The tap's release reverses a press animation that has not started yet; it must stop it, as
  // Flutter's controller does, not leave it running to the pressed size.
  const { box, thumb } = await renderSwitch(false);
  const handlers = box.props as Handlers;
  await act(async () => {
    handlers.onResponderGrant(touchEvent(0));
    handlers.onResponderRelease(touchEvent(0));
    await jest.advanceTimersByTimeAsync(400);
  });
  expect(animatedStyle(thumb)).toMatchObject({ width: 16, height: 16 });
});

test('a vertical move past the slop is not a tap', async () => {
  const { box, onChanged } = await renderSwitch(false);
  const handlers = box.props as Handlers;
  await act(async () => {
    handlers.onResponderGrant(touchEvent(0));
    handlers.onResponderMove(touchEvent(0, 30));
    handlers.onResponderRelease(touchEvent(0, 30));
  });
  expect(onChanged).not.toHaveBeenCalled();
});

test('a drag past half of the track flips the value; a short one does not', async () => {
  const { box, onChanged } = await renderSwitch(false);
  const handlers = box.props as Handlers;
  await act(async () => {
    handlers.onResponderGrant(touchEvent(0));
    handlers.onResponderMove(touchEvent(20)); // past the 18 slop: the drag starts here
    handlers.onResponderMove(touchEvent(26)); // 6 of the track's 20: 0.3
    handlers.onResponderRelease(touchEvent(26));
  });
  expect(onChanged).not.toHaveBeenCalled();

  await act(async () => {
    await jest.advanceTimersByTimeAsync(400);
    handlers.onResponderGrant(touchEvent(0));
    handlers.onResponderMove(touchEvent(20));
    handlers.onResponderMove(touchEvent(32)); // 12 of 20: 0.6
    handlers.onResponderRelease(touchEvent(32));
  });
  expect(onChanged).toHaveBeenCalledWith(true);
});
