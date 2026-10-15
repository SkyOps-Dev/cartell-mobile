// Material 3 (2021) text styles as Flutter 3.41.9 defines them (typography.dart englishLike2021;
// spec 07 §3.1), and Flutter's merge rule: a style that only sets a size keeps the base style's
// letter-spacing and *height multiplier*, so its line height scales with the new size.

import { TextStyle } from 'react-native';

import { ColorScheme } from './colors';

/** 'Source Sans Pro' (pubspec fonts; the file's PostScript name, regular face only). */
export const kSourceSansPro = 'SourceSansPro-Regular';

export type M3Style = {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
  /** Flutter's TextStyle.height: line height as a multiple of the font size. */
  height: number;
  color?: string;
  fontFamily?: string;
};

export const M3 = {
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.5,
    height: 1.5,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.25,
    height: 1.43,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.4,
    height: 1.33,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
    height: 1.43,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.15,
    height: 1.5,
  },
  headlineSmall: {
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 0,
    height: 1.33,
  },
} satisfies Record<string, M3Style>;

/**
 * The ambient text style on a Material surface (Scaffold, dialog): bodyMedium in onSurface
 * (#E6E0E9; Typography.material2021 colours the dark text theme with colorScheme.onSurface).
 * A Flutter `Text` with no style uses this.
 */
export const ambientTextStyle: M3Style = {
  ...M3.bodyMedium,
  color: ColorScheme.onSurface,
};

/** Flutter's TextStyle.merge: fields set in `override` win; everything else is kept. */
export function merge(base: M3Style, override: Partial<M3Style>): M3Style {
  const result = { ...base };
  (Object.keys(override) as (keyof M3Style)[]).forEach(key => {
    if (override[key] !== undefined) {
      (result as Record<string, unknown>)[key] = override[key];
    }
  });
  return result;
}

/** Converts a resolved Flutter style to a React Native text style. */
export function toRN(style: M3Style): TextStyle {
  return {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
    lineHeight: style.fontSize * style.height,
    ...(style.color !== undefined ? { color: style.color } : null),
    ...(style.fontFamily !== undefined
      ? { fontFamily: style.fontFamily }
      : null),
  };
}

/** Shorthand: merge `override` into `base` and convert. */
export function textStyle(
  base: M3Style,
  override: Partial<M3Style> = {},
): TextStyle {
  return toRN(merge(base, override));
}
