// Port of the colour constants in frontend/lib/utilities/constants.dart, plus the Material
// colours and Material 3 dark ColorScheme roles the Flutter app picks up by default (spec 00,
// spec 07 §3.1).

export const kActiveCardColor = '#1D1E33';
export const kInactiveCardColor = '#111328';
export const kCartellBlack = '#25282A';
export const kCartellBlue = '#6787B7';
export const kCartellDarkGray = '#54585A';
export const kCartellLightGray = '#A2AAAD';
export const kCartellYellow = '#FFB500';
export const kCartellAppScaffoldColor = '#25282A';
export const kCartellAlertRed = '#FF5252';
export const kCartellStatusGreen = '#69F0AE';

/** main.dart scaffoldBackgroundColor: every screen's background. */
export const kScaffoldBackground = '#0A0E21';

/** Flutter `Colors` values used directly by screens. */
export const MaterialColors = {
  white: '#FFFFFF',
  white70: 'rgba(255, 255, 255, 0.7)',
  black: '#000000',
  black54: 'rgba(0, 0, 0, 0.54)',
  grey: '#9E9E9E',
  red: '#F44336',
  /** Colors.orange (shade 500). */
  orange: '#FF9800',
} as const;

/**
 * The roles in use from `_colorSchemeDarkM3`, the scheme `ThemeData.dark()` gets with Material 3 on
 * (theme_data.dart: `colorScheme ??= isDark ? _colorSchemeDarkM3 : ...`; spec 07 §3.1). It is the
 * Material 3 baseline, not the older `ColorScheme.dark()`.
 */
export const ColorScheme = {
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',
  error: '#F2B8B5',
  surface: '#141218',
  surfaceContainerLow: '#1D1B20',
  surfaceContainer: '#211F26',
  surfaceContainerHighest: '#36343B',
  onSurface: '#E6E0E9',
  onSurfaceVariant: '#CAC4D0',
  outline: '#938F99',
  outlineVariant: '#49454F',
} as const;

/**
 * AppBar icon colours (_AppBarDefaultsM3): iconTheme for the leading button, actionsIconTheme for
 * the actions. Measured on the Flutter Hubs screen (RMX5070, 2026-10-15): #E6E0E9 and #CAC4D0.
 */
export const kAppBarIconColor = ColorScheme.onSurface;
export const kAppBarActionsIconColor = ColorScheme.onSurfaceVariant;

/** ThemeData.dark() ink colours (theme_data.dart: highlightColor / splashColor, dark). */
export const kInkHighlightColor = 'rgba(204, 204, 204, 0.25)'; // 0x40CCCCCC
export const kInkSplashColor = 'rgba(204, 204, 204, 0.25)'; // 0x40CCCCCC

/** Returns `hex` (#RRGGBB) with the given opacity, like Flutter's Color.withOpacity. */
/* eslint-disable no-bitwise */
export function withOpacity(hex: string, opacity: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
/* eslint-enable no-bitwise */

/**
 * ThemeData.estimateBrightnessForColor for `hex` (#RRGGBB): 'dark' asks for light content on
 * top of it. Relative luminance per WCAG 2.0, with Material's 0.15 threshold.
 */
export function estimateBrightnessForColor(hex: string): 'light' | 'dark' {
  const linear = (offset: number) => {
    const component = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return component <= 0.03928
      ? component / 12.92
      : Math.pow((component + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * linear(1) + 0.7152 * linear(3) + 0.0722 * linear(5);
  return (luminance + 0.05) * (luminance + 0.05) > 0.15 ? 'light' : 'dark';
}
