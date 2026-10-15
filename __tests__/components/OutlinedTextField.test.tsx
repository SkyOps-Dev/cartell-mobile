// The label width cap from input_decorator.dart _RenderDecoration.performLayout (spec 07 §3.1).

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { OutlinedTextField } from '../../src/components/forms/OutlinedTextField';
import { Icons } from '../../src/components/icons/iconData';

const icon = { icon: Icons.person_outline, color: '#FFB500' };

async function layoutBox(label: string, width: number) {
  const labelView = screen.getByText(label).parent!;
  const box = labelView.parent!;
  await fireEvent(box, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 48 } },
  });
  return () => StyleSheet.flatten(screen.getByText(label).parent!.props.style);
}

describe('OutlinedTextField label', () => {
  test('resting beside a prefix icon: box − (4 × 2 + 48 + 20)', async () => {
    await render(
      <OutlinedTextField labelText="First Name" prefixIcon={icon} />,
    );
    const style = await layoutBox('First Name', 164);
    expect(style().maxWidth).toBe(164 - 76);
  });

  test('resting without an icon: box − (4 × 2 + 20 + 20)', async () => {
    await render(<OutlinedTextField labelText="Last Name" />);
    const style = await layoutBox('Last Name', 164);
    expect(style().maxWidth).toBe(164 - 48);
  });

  test('resting with a suffix: the suffix width replaces the end padding', async () => {
    await render(
      <OutlinedTextField
        labelText="Password"
        prefixIcon={icon}
        suffix={<Text>eye</Text>}
      />,
    );
    const style = await layoutBox('Password', 345);
    expect(style().maxWidth).toBe(345 - (8 + 48 + 48));
  });

  test('floated: the end is padding again and the cap grows by 1 / 0.75', async () => {
    await render(
      <OutlinedTextField
        labelText="First Name"
        prefixIcon={icon}
        value="Ann"
      />,
    );
    const style = await layoutBox('First Name', 164);
    expect(style().maxWidth).toBeCloseTo((164 - 76) / 0.75);
  });

  test('ends in an ellipsis when it does not fit', async () => {
    await render(
      <OutlinedTextField labelText="First Name" prefixIcon={icon} />,
    );
    const text = screen.getByText('First Name');
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.ellipsizeMode).toBe('tail');
  });

  test('stays hidden until the box has been measured', async () => {
    await render(
      <OutlinedTextField labelText="First Name" prefixIcon={icon} />,
    );
    const labelStyle = () =>
      StyleSheet.flatten(screen.getByText('First Name').parent!.props.style);
    expect(labelStyle().opacity).toBe(0);
    await layoutBox('First Name', 164);
    expect(labelStyle().opacity).toBeUndefined();
  });
});

describe('OutlinedTextField hint', () => {
  test('is drawn as one line ending in an ellipsis, in onSurfaceVariant', async () => {
    await render(<OutlinedTextField hintText="Enter your email" />);
    const hint = screen.getByText('Enter your email');
    expect(hint.props.numberOfLines).toBe(1);
    expect(hint.props.ellipsizeMode).toBe('tail');
    expect(StyleSheet.flatten(hint.props.style).color).toBe('#CAC4D0');
  });

  test('the native placeholder stays for screen readers but is not drawn', async () => {
    await render(<OutlinedTextField hintText="Enter your email" />);
    const input = screen.getByPlaceholderText('Enter your email');
    expect(input.props.placeholderTextColor).toBe('transparent');
    expect(input.props.numberOfLines).toBe(1);
  });

  test('beside a label, shows only once the label has floated', async () => {
    await render(
      <OutlinedTextField
        labelText="First Name"
        hintText="First Name hint"
        prefixIcon={icon}
        testID="field"
      />,
    );
    expect(screen.queryByText('First Name hint')).toBeNull();
    await fireEvent(screen.getByTestId('field'), 'focus');
    expect(screen.getByText('First Name hint')).toBeTruthy();
  });
});
