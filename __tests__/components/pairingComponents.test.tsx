// The components the pairing wizard brought: the hub light (components/hub_light_widget.dart;
// ported from frontend/test/components/hub_light_widget_test.dart), the indeterminate LinearProgressIndicator's line positions (progress_indicator.dart), the
// underline text field, and ListTile's trailing widget.

import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { UnderlineTextField } from '../../src/components/forms/UnderlineTextField';
import {
  hubLightResetting,
  HubLightWidget,
  hubLightWifiAccessPointMode,
} from '../../src/components/HubLightWidget';
import { ListTile } from '../../src/components/lists/ListTile';
import { linesAt } from '../../src/components/progress/LinearProgressIndicator';
import { ColorScheme, kCartellBlack } from '../../src/theme/colors';

const fill = () =>
  StyleSheet.flatten(
    screen.getByTestId('hub-light', { includeHiddenElements: true }).props
      .style,
  ).backgroundColor;

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe('HubLightWidget', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('plays each colour for its duration, looping from the first', async () => {
    await render(
      <HubLightWidget pattern={hubLightWifiAccessPointMode.pattern} />,
    );
    await advance(0);
    expect(fill()).toBe('#8BC34A'); // 60 ms of light green
    await advance(60);
    expect(fill()).toBe(kCartellBlack); // then 3000 ms off
    await advance(2999);
    expect(fill()).toBe(kCartellBlack);
    await advance(1);
    expect(fill()).toBe('#8BC34A');
  });

  test('the reset pattern flashes red every 100 ms', async () => {
    await render(<HubLightWidget pattern={hubLightResetting.pattern} />);
    await advance(0);
    expect(fill()).toBe('#F44336');
    await advance(100);
    expect(fill()).toBe(kCartellBlack);
    await advance(100);
    expect(fill()).toBe('#F44336');
  });

  test('with reduce motion on it holds the first lit colour', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await render(
      <HubLightWidget pattern={hubLightWifiAccessPointMode.pattern} />,
    );
    await advance(5000);
    expect(fill()).toBe('#8BC34A');
  });

  test('a 45 circle with a white 5 border, named for screen readers when given a label', async () => {
    await render(
      <HubLightWidget
        pattern={hubLightWifiAccessPointMode.pattern}
        semanticLabel="Wi-Fi Pairing Mode"
      />,
    );
    const style = StyleSheet.flatten(
      screen.getByTestId('hub-light', { includeHiddenElements: true }).props
        .style,
    );
    expect(style).toMatchObject({
      width: 45,
      height: 45,
      borderWidth: 5,
      borderColor: '#FFFFFF',
    });
    expect(screen.getByLabelText('Wi-Fi Pairing Mode')).toBeTruthy();
  });

  test('a missing label does not produce a silent focusable image', async () => {
    await render(<HubLightWidget pattern={hubLightResetting.pattern} />);
    const light = screen.getByTestId('hub-light', {
      includeHiddenElements: true,
    });
    expect(light.props.accessible).toBe(false);
    expect(light.props.accessibilityRole).toBeUndefined();
  });

  test('changes once per segment, with one timer per light', async () => {
    await render(<HubLightWidget pattern={hubLightResetting.pattern} />);
    await advance(0);
    expect(jest.getTimerCount()).toBe(1);
    const seen: unknown[] = [];
    for (let i = 0; i < 10; i++) {
      seen.push(fill());
      await advance(100);
    }
    // Ten segments of 100 ms, alternating: a two-state blink, not a 10 ms tick.
    expect(new Set(seen).size).toBe(2);
    expect(jest.getTimerCount()).toBe(1);
  });

  test('a fresh light starts at the beginning of the sequence', async () => {
    await render(
      <HubLightWidget pattern={hubLightWifiAccessPointMode.pattern} />,
    );
    await advance(1000);
    await render(
      <HubLightWidget pattern={hubLightWifiAccessPointMode.pattern} />,
    );
    await advance(0);
    expect(fill()).toBe('#8BC34A');
  });

  test('going away stops its timer', async () => {
    await render(<HubLightWidget pattern={hubLightResetting.pattern} />);
    await advance(50);
    expect(jest.getTimerCount()).toBe(1);
    await act(async () => screen.unmount());
    expect(jest.getTimerCount()).toBe(0);
  });

  test('two lights on the same pattern run on their own timers', async () => {
    function Two({ second }: { second: boolean }) {
      return (
        <>
          <HubLightWidget pattern={hubLightResetting.pattern} />
          {second && <HubLightWidget pattern={hubLightResetting.pattern} />}
        </>
      );
    }
    await render(<Two second />);
    await advance(10);
    expect(jest.getTimerCount()).toBe(2);
    await screen.rerender(<Two second={false} />);
    await advance(0);
    expect(jest.getTimerCount()).toBe(1);
  });

  test('a parent redraw does not restart the blink; a new pattern does', async () => {
    function Host({ tick, reset }: { tick: number; reset: boolean }) {
      return (
        <>
          <Text>{tick}</Text>
          <HubLightWidget
            pattern={
              reset
                ? hubLightResetting.pattern
                : hubLightWifiAccessPointMode.pattern
            }
          />
        </>
      );
    }
    await render(<Host tick={0} reset={false} />);
    await advance(60); // past the 60 ms flash: off
    expect(fill()).toBe(kCartellBlack);
    await screen.rerender(<Host tick={1} reset={false} />);
    await advance(0);
    expect(fill()).toBe(kCartellBlack);
    await screen.rerender(<Host tick={1} reset />);
    await advance(0);
    expect(fill()).toBe('#F44336');
  });
});

describe('LinearProgressIndicator (indeterminate, year2023)', () => {
  test('both lines are empty at the start of a cycle', () => {
    const [[tail1, head1], [tail2, head2]] = linesAt(0);
    expect(head1 - tail1).toBe(0);
    expect(head2 - tail2).toBe(0);
  });

  test('line 1 runs first; line 2 starts at 1000/1800 and both end at the right', () => {
    // Before 333/1800 only line 1 has started, and its tail has not moved yet.
    const [[tail1, head1], line2] = linesAt(300 / 1800);
    expect(head1).toBeGreaterThan(tail1);
    expect(tail1).toBe(0);
    expect(line2).toEqual([0, 0]);

    const [first, [tail2, head2]] = linesAt(1300 / 1800);
    expect(first).toEqual([1, 1]);
    expect(head2).toBeGreaterThan(tail2);

    expect(linesAt(1)).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });
});

describe('UnderlineTextField', () => {
  test('shows its error under the field, and the hint while empty', async () => {
    await render(
      <UnderlineTextField
        testID="field"
        value=""
        onChangeText={() => undefined}
        hintText="Enter network password"
        errorText="Too long"
        errorMaxLines={3}
      />,
    );
    expect(screen.getByTestId('field').props.placeholder).toBe(
      'Enter network password',
    );
    const error = screen.getByText('Too long');
    expect(error.props.numberOfLines).toBe(3);
    expect(StyleSheet.flatten(error.props.style).color).toBe(ColorScheme.error);
  });

  test('passes what is typed on', async () => {
    const onChangeText = jest.fn();
    await render(
      <UnderlineTextField
        testID="field"
        value=""
        onChangeText={onChangeText}
      />,
    );
    await fireEvent.changeText(screen.getByTestId('field'), 'abc');
    expect(onChangeText).toHaveBeenCalledWith('abc');
  });
});

describe('ListTile', () => {
  test('a trailing widget sits after the title; no leading icon is fine', async () => {
    await render(<ListTile title="Home" trailing={<Text>signal</Text>} />);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('"Home"')).toBeLessThan(tree.indexOf('"signal"'));
  });
});
