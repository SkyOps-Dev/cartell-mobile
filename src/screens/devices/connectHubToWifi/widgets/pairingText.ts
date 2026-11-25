// The pairing screens' Text styles: each is a Flutter TextStyle merged over the ambient style
// (bodyMedium in onSurface), as a `Text(style: TextStyle(...))` is. Shared here because every
// screen builds them the same way.

import type { TextStyle } from 'react-native';

import {
  ambientTextStyle,
  M3Style,
  merge,
  toRN,
} from '../../../../theme/typography';

export function pairingText(
  override: Partial<M3Style>,
  textAlign?: TextStyle['textAlign'],
): TextStyle {
  return {
    ...toRN(merge(ambientTextStyle, override)),
    ...(textAlign !== undefined ? { textAlign } : null),
    includeFontPadding: false,
  };
}
