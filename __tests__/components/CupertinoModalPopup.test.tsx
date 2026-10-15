// showCupertinoModalPopup (Flutter's CupertinoModalPopupRoute): the spring timing, opening,
// closing from the barrier, Back, and Navigator.pop from inside.

import React from 'react';
import { Animated, BackHandler, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import {
  CupertinoModalPopupHost,
  popModalPopup,
  showCupertinoModalPopup,
  springSettleMs,
} from '../../src/components/popups/CupertinoModalPopup';

// Jest runs the iOS BackHandler, which never calls back: capture the handler and press it.
const backHandlers: (() => boolean | null | undefined)[] = [];
jest
  .spyOn(BackHandler, 'addEventListener')
  .mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return {
      remove: () => {
        backHandlers.splice(backHandlers.indexOf(handler as () => boolean), 1);
      },
    };
  });
const pressBack = () => backHandlers[backHandlers.length - 1]?.();

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
}

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());
afterEach(async () => {
  for (let i = 0; i < 3; i++) {
    await act(async () => popModalPopup());
    await settle();
  }
});

describe('the spring (stiffness 522.35, critically damped, from rest)', () => {
  test('a full slide settles after 405 ms (Flutter: about iOS’s 0.404 s)', () => {
    expect(springSettleMs(1)).toBe(405);
  });

  test('a shorter distance settles sooner', () => {
    expect(springSettleMs(0.5)).toBeLessThan(springSettleMs(1));
    expect(springSettleMs(0)).toBe(1);
  });
});

describe('showCupertinoModalPopup', () => {
  /** The panel's first layout, which the phone reports after it mounts. */
  async function layOut() {
    await act(async () => {
      fireEvent(screen.getByTestId('modal-popup-child'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 720 } },
      });
    });
  }

  async function open({ measure = true } = {}) {
    await render(<CupertinoModalPopupHost />);
    let closed = false;
    await act(async () => {
      showCupertinoModalPopup(() => <Text>panel</Text>).then(() => {
        closed = true;
      });
    });
    if (measure) {
      await layOut();
    }
    return () => closed;
  }

  test('renders the builder until it is closed', async () => {
    await open();
    expect(screen.getByText('panel')).toBeTruthy();
  });

  test('tapping the barrier closes it and resolves the promise', async () => {
    const closed = await open();
    await settle();
    await fireEvent.press(
      screen.getByTestId('modal-popup-barrier', {
        includeHiddenElements: true,
      }),
    );
    expect(closed()).toBe(false);
    await settle();
    expect(screen.queryByText('panel')).toBeNull();
    expect(closed()).toBe(true);
  });

  test('Android Back closes it', async () => {
    await open();
    await act(async () => pressBack());
    await settle();
    expect(screen.queryByText('panel')).toBeNull();
  });

  test('popModalPopup closes it, as Navigator.pop from inside', async () => {
    await open();
    await act(async () => popModalPopup());
    await settle();
    expect(screen.queryByText('panel')).toBeNull();
  });

  test('nothing in it takes touches while it closes', async () => {
    await open();
    await settle();
    await act(async () => popModalPopup());
    expect(screen.getByTestId('modal-popup-route').props.pointerEvents).toBe(
      'none',
    );
  });

  test('the slide starts only once the panel has been measured, from the bottom', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await open({ measure: false });
    expect(timing).not.toHaveBeenCalled();
    await layOut();
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toMatchObject({
      toValue: 1,
      duration: 405,
    });
    // A later layout (the Switch Environment view) does not restart it.
    await layOut();
    expect(timing).toHaveBeenCalledTimes(1);
    timing.mockRestore();
  });

  test('closed before it was measured, it goes at once (nothing has slid in yet)', async () => {
    const closed = await open({ measure: false });
    await act(async () => popModalPopup());
    expect(screen.queryByText('panel')).toBeNull();
    expect(closed()).toBe(true);
  });

  test('closing with nothing open does nothing', async () => {
    await render(<CupertinoModalPopupHost />);
    expect(() => popModalPopup()).not.toThrow();
  });
});
