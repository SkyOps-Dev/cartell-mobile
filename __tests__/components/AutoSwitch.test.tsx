// Ported from frontend/test/components/forms/auto_switch_test.dart, plus the toasts it shows.

import React from 'react';
import { View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AutoSwitch } from '../../src/components/forms/AutoSwitch';
import {
  resetToastsForTests,
  ToastHost,
} from '../../src/components/popups/toasts';
import { ResultOf } from '../../src/services/result';
import { ValueNotifier } from '../../src/utilities/valueNotifier';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await act(async () => resetToastsForTests());
  jest.useRealTimers();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

async function pump(child: React.ReactNode) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastHost>{child}</ToastHost>
    </SafeAreaProvider>,
  );
}

/** A quick tap on the switch (its PanResponder). */
async function tapSwitch() {
  const handlers = screen.getByRole('switch').props as {
    onResponderGrant: (e: unknown) => void;
    onResponderRelease: (e: unknown) => void;
  };
  const event = {
    nativeEvent: { pageX: 0, pageY: 0, timestamp: 1 },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: 0,
          startTimeStamp: 1,
          currentPageX: 0,
          currentPageY: 0,
          currentTimeStamp: 1,
          previousPageX: 0,
          previousPageY: 0,
          previousTimeStamp: 1,
        },
      ],
    },
  };
  await act(async () => {
    handlers.onResponderGrant(event);
    handlers.onResponderRelease(event);
  });
}

describe('after the switch is gone', () => {
  test('a success that lands after it went away does not throw or toast', async () => {
    const gate = deferred<ResultOf<string>>();
    const controller = new ValueNotifier(false);
    const view = await pump(
      <AutoSwitch
        boolController={controller}
        processTap={() => gate.promise}
      />,
    );
    await tapSwitch();
    await view.rerender(
      <SafeAreaProvider initialMetrics={metrics}>
        <ToastHost>
          <View />
        </ToastHost>
      </SafeAreaProvider>,
    );
    await act(async () => {
      gate.resolve(ResultOf.success('Switched on.'));
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(screen.queryByText('Switched on.')).toBeNull();
  });

  test('a failure that lands after it went away still resets the value', async () => {
    const gate = deferred<ResultOf<string>>();
    const controller = new ValueNotifier(false);
    const view = await pump(
      <AutoSwitch
        boolController={controller}
        processTap={() => gate.promise}
      />,
    );
    await tapSwitch();
    expect(controller.value).toBe(true); // the optimistic flip
    await view.rerender(
      <SafeAreaProvider initialMetrics={metrics}>
        <ToastHost>
          <View />
        </ToastHost>
      </SafeAreaProvider>,
    );
    await act(async () => {
      gate.resolve(ResultOf.failure({ message: 'Nope.' }));
    });
    // The controller belongs to the caller and outlives the switch.
    expect(controller.value).toBe(false);
  });
});

describe('while shown', () => {
  test('a failure rolls the switch back and toasts its first message', async () => {
    const controller = new ValueNotifier(false);
    await pump(
      <AutoSwitch
        boolController={controller}
        processTap={async () => ResultOf.failure({ message: 'Nope.' })}
      />,
    );
    await tapSwitch();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    expect(controller.value).toBe(false);
    expect(screen.getByText('Nope.')).toBeTruthy();
  });

  test('a failure with no message toasts "Failed to switch."', async () => {
    await pump(
      <AutoSwitch
        boolController={new ValueNotifier(true)}
        processTap={async () => ResultOf.failure()}
      />,
    );
    await tapSwitch();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByText('Failed to switch.')).toBeTruthy();
  });

  test('a success keeps the new value and toasts its text', async () => {
    const controller = new ValueNotifier(false);
    const processTap = jest.fn(async (value: boolean) =>
      ResultOf.success(`turned ${value ? 'on' : 'off'}`),
    );
    await pump(
      <AutoSwitch boolController={controller} processTap={processTap} />,
    );
    await tapSwitch();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });
    expect(processTap).toHaveBeenCalledWith(true);
    expect(controller.value).toBe(true);
    expect(screen.getByRole('switch').props.accessibilityState).toEqual({
      checked: true,
    });
    expect(screen.getByText('turned on')).toBeTruthy();
  });
});
