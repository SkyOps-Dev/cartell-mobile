// Glyph placement from Flutter's icon.dart: SizedBox(size) → Center → RichText(overflow: visible).

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { Icon } from '../../src/components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../src/components/icons/iconData';

const glyphStyle = (codePoint: number) =>
  StyleSheet.flatten(
    screen.getByText(String.fromCodePoint(codePoint), {
      includeHiddenElements: true,
    }).props.style,
  );

describe('Icon', () => {
  test('a glyph wider than its box starts at the left edge and spills right', async () => {
    await render(<Icon icon={FontAwesomeIcons.arrowLeftLong} color="#fff" />);
    const style = glyphStyle(FontAwesomeIcons.arrowLeftLong.codePoint);
    expect(style.left).toBe(0);
    // 1.125 em at 24 = 27, plus one pixel so rounding never clips it.
    expect(style.width).toBe(28);
  });

  test('a glyph narrower than its box is centred', async () => {
    await render(<Icon icon={FontAwesomeIcons.clipboardList} color="#fff" />);
    const style = glyphStyle(FontAwesomeIcons.clipboardList.codePoint);
    expect(style.left).toBe(3); // (24 − 18) / 2
  });

  test('a one-em glyph fills its box', async () => {
    await render(<Icon icon={Icons.lock_outline} color="#fff" size={18} />);
    const style = glyphStyle(Icons.lock_outline.codePoint);
    expect(style.left).toBe(0);
    expect(style.width).toBe(19);
  });
});
