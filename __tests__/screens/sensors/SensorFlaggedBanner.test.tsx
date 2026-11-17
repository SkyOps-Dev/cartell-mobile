// Ported from frontend/test/screens/sensors/sensor_flagged_banner_test.dart
//
// frontend/test/screens/sensors/sensor_view_wiring_test.dart is not ported: it checks that Contact
// Support dispatches GoToContactUsScreen on the MainAppBloc, and the Help screen it opens is not
// built yet (a PORT-GAP on the sensor page). SensorView's tests check the button is there and live.

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SensorFlaggedBanner } from '../../../src/screens/sensors/SensorFlaggedBanner';
import {
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../../src/theme/colors';

type Node = { parent: Node | null; props: { style?: unknown } };

/** The pill RoundedButton paints: the nearest ancestor of the button with a background. */
function fill(button: Node): string | undefined {
  let node: Node | null = button.parent;
  while (node) {
    const style = StyleSheet.flatten(node.props.style as never) as
      | { backgroundColor?: string }
      | undefined;
    if (style?.backgroundColor) {
      return style.backgroundColor;
    }
    node = node.parent;
  }
  return undefined;
}

const contactSupport = () =>
  screen.getByRole('button', { name: 'Contact Support' });

describe('SensorFlaggedBanner', () => {
  test('renders the suspicious-activity message when isBlacklisted is true', async () => {
    await render(
      <SensorFlaggedBanner isBlacklisted onContactSupport={() => {}} />,
    );
    expect(screen.getByText(/flagged for suspicious activity/)).toBeTruthy();
  });

  test('renders a Contact Support button when isBlacklisted is true', async () => {
    await render(
      <SensorFlaggedBanner isBlacklisted onContactSupport={() => {}} />,
    );
    expect(contactSupport()).toBeTruthy();
  });

  test('invokes onContactSupport exactly once when the button is tapped', async () => {
    const onContactSupport = jest.fn();
    await render(
      <SensorFlaggedBanner isBlacklisted onContactSupport={onContactSupport} />,
    );
    await fireEvent.press(contactSupport());
    expect(onContactSupport).toHaveBeenCalledTimes(1);
  });

  test('renders nothing when isBlacklisted is false', async () => {
    await render(
      <SensorFlaggedBanner isBlacklisted={false} onContactSupport={() => {}} />,
    );
    expect(screen.queryByText(/flagged for suspicious activity/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('does NOT call onContactSupport on initial build', async () => {
    const onContactSupport = jest.fn();
    await render(
      <SensorFlaggedBanner isBlacklisted onContactSupport={onContactSupport} />,
    );
    expect(onContactSupport).not.toHaveBeenCalled();
  });

  test('disables the button when onContactSupport is null', async () => {
    await render(<SensorFlaggedBanner isBlacklisted onContactSupport={null} />);
    expect(fill(contactSupport())).toBe(kCartellLightGray);
  });
});

describe('SensorFlaggedBanner — visual style', () => {
  test('button uses kCartellYellow with black title', async () => {
    await render(
      <SensorFlaggedBanner isBlacklisted onContactSupport={() => {}} />,
    );
    expect(fill(contactSupport())).toBe(kCartellYellow);
    const title = screen.getByText('Contact Support');
    expect(StyleSheet.flatten(title.props.style).color).toBe(
      MaterialColors.black,
    );
  });

  test('banner box uses the design background colour + red border', async () => {
    await render(
      <SensorFlaggedBanner isBlacklisted onContactSupport={() => {}} />,
    );
    const box = StyleSheet.flatten(
      screen.getByTestId('sensor-flagged-banner').props.style,
    );
    expect(box).toMatchObject({
      backgroundColor: '#EE9999',
      borderColor: MaterialColors.red,
      borderWidth: 1,
      borderRadius: 10,
    });
  });

  test('warning text is centered and black (it wraps, as RN text does)', async () => {
    await render(
      <SensorFlaggedBanner isBlacklisted onContactSupport={() => {}} />,
    );
    const text = StyleSheet.flatten(
      screen.getByText(/flagged for suspicious activity/).props.style,
    );
    expect(text.color).toBe(MaterialColors.black);
    expect(text.textAlign).toBe('center');
  });
});
