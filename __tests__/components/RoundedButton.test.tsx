// Ported from frontend/test/components/forms/rounded_button_test.dart

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { RoundedButton } from '../../src/components/buttons/RoundedButton';
import {
  kCartellBlack,
  kCartellLightGray,
  kCartellYellow,
} from '../../src/theme/colors';

/** The pill RoundedButton paints: the nearest ancestor of the button with a background. */
type Node = { parent: Node | null; props: { style?: unknown } };

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

describe('RoundedButton disabled state', () => {
  test('a null handler takes the Gravel fill, not Deep Gravel', async () => {
    await render(
      <RoundedButton
        onPressed={null}
        title="Submit"
        buttonTitleColor={kCartellBlack}
      />,
    );
    // Deep Gravel behind the near-black label is 2.06:1; a disabled button still has to read.
    expect(fill(screen.getByRole('button', { name: 'Submit' }))).toBe(
      kCartellLightGray,
    );
  });

  test('an enabled button keeps the colour it was given', async () => {
    await render(
      <RoundedButton
        onPressed={() => {}}
        title="Submit"
        buttonColor={kCartellYellow}
        buttonTitleColor={kCartellBlack}
      />,
    );
    expect(fill(screen.getByRole('button', { name: 'Submit' }))).toBe(
      kCartellYellow,
    );
  });
});

describe('RoundedButton semantics', () => {
  test('announces as a button with its label', async () => {
    await render(
      <RoundedButton
        onPressed={() => {}}
        title="Start Pairing"
        buttonTitleColor={kCartellBlack}
      />,
    );
    const button = screen.getByRole('button', { name: 'Start Pairing' });
    expect(button.props.accessibilityState).toEqual({ disabled: false });
  });

  test('a null handler announces as disabled', async () => {
    await render(
      <RoundedButton
        onPressed={null}
        title="Submit"
        buttonTitleColor={kCartellBlack}
      />,
    );
    // Disabled has to be stated, not merely absent.
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });
});

describe('RoundedButton width', () => {
  /** alignSelf of the pill and of every ancestor up to the root. */
  function alignSelves(button: Node): Array<string | undefined> {
    const out: Array<string | undefined> = [];
    let node: Node | null = button.parent;
    while (node) {
      const style = StyleSheet.flatten(node.props.style as never) as
        | { alignSelf?: string; backgroundColor?: string }
        | undefined;
      if (style?.backgroundColor || out.length > 0) {
        out.push(style?.alignSelf);
      }
      node = node.parent;
    }
    return out;
  }

  // Flutter's button is as wide as its Row, which takes all the width it is given
  // (button.dart:414, Center(widthFactor: 1.0)): it fills a centred column, not just a stretched one.
  test('fills its parent, the pill and its padding both stretched', async () => {
    await render(<RoundedButton onPressed={() => {}} title="Yes" />);
    const [pill, padding] = alignSelves(
      screen.getByRole('button', { name: 'Yes' }),
    );
    expect(pill).toBe('stretch');
    expect(padding).toBe('stretch');
  });

  test('a caller padding replaces the vertical 8 but still fills', async () => {
    await render(
      <RoundedButton
        onPressed={() => {}}
        title="Yes"
        padding={{ paddingBottom: 25 }}
      />,
    );
    const [, padding] = alignSelves(
      screen.getByRole('button', { name: 'Yes' }),
    );
    expect(padding).toBe('stretch');
  });
});
