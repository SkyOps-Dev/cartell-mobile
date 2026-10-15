// Port of Material 3's ListTile (material/list_tile.dart, Flutter 3.41.9) as the app uses it: a
// leading icon, a one-line title, an onTap (spec 07 §3.1).
// - Height: max(56, title height + 2 × 8) (_defaultTileHeight for one line; minVerticalPadding 8).
//   The title is centred vertically; the leading widget too (titleAlignment threeLine on a
//   two-line-or-less tile = centre).
// - Horizontal: contentPadding (start 16, end 24 by default; 0 inside a popup menu item), the
//   leading box at least 24 wide (minLeadingWidth), then a 16 gap (horizontalTitleGap), then the
//   title over the rest.
// - Colours: title onSurface (#E6E0E9), icons onSurfaceVariant (#CAC4D0); measured in the Flutter
//   drawer (RMX5070, 2026-10-15). The tile is transparent.
// - Title style: bodyLarge in onSurface by default; a ListTileTheme can replace it (a popup menu
//   item passes labelLarge in onSurface, and no content padding). The Text's own style merges over
//   it (the NavBar's fontSize 14).
// - Ink: the whole tile, square, the theme's #40CCCCCC highlight and splash.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ColorScheme,
  kInkHighlightColor,
  kInkSplashColor,
} from '../../theme/colors';
import { M3, M3Style, merge, toRN } from '../../theme/typography';
import { Icon } from '../icons/Icon';
import type { IconData } from '../icons/iconData';
import { InkWell } from '../ink/InkWell';

const MIN_TILE_HEIGHT = 56;
const MIN_VERTICAL_PADDING = 8;
const MIN_LEADING_WIDTH = 24;
const HORIZONTAL_TITLE_GAP = 16;

/** The ListTile icon colour (_LisTileDefaultsM3.iconColor). */
export const kListTileIconColor = ColorScheme.onSurfaceVariant;

type ListTileThemeData = {
  contentPadding?: { start: number; end: number };
  titleTextStyle?: M3Style;
};

const ListTileThemeContext = React.createContext<ListTileThemeData>({});

/** ListTileTheme.merge: overrides for the tiles below it (a PopupMenuItem uses it). */
export function ListTileTheme({
  value,
  children,
}: {
  value: ListTileThemeData;
  children: React.ReactNode;
}) {
  return (
    <ListTileThemeContext.Provider value={value}>
      {children}
    </ListTileThemeContext.Provider>
  );
}

type Props = {
  leadingIcon: IconData;
  leadingIconSize?: number;
  title: string;
  /** Merged over the tile's title style, as the title Text's own `style:`. */
  titleStyle?: Partial<M3Style>;
  onTap?: () => void;
};

export function ListTile({
  leadingIcon,
  leadingIconSize = 24,
  title,
  titleStyle = {},
  onTap,
}: Props) {
  const theme = React.useContext(ListTileThemeContext);
  const contentPadding = theme.contentPadding ?? { start: 16, end: 24 };
  const resolved = merge(
    theme.titleTextStyle ?? { ...M3.bodyLarge, color: ColorScheme.onSurface },
    titleStyle,
  );
  const lineHeight = resolved.fontSize * resolved.height;
  return (
    <InkWell
      accessibilityRole="button"
      onPress={onTap}
      highlightColor={kInkHighlightColor}
      splashColor={kInkSplashColor}
      style={[
        styles.tile,
        {
          minHeight: Math.max(
            MIN_TILE_HEIGHT,
            lineHeight + 2 * MIN_VERTICAL_PADDING,
          ),
          paddingLeft: contentPadding.start,
          paddingRight: contentPadding.end,
        },
      ]}
    >
      <View
        style={[
          styles.leading,
          { minWidth: MIN_LEADING_WIDTH, marginRight: HORIZONTAL_TITLE_GAP },
        ]}
      >
        <Icon
          icon={leadingIcon}
          size={leadingIconSize}
          color={kListTileIconColor}
        />
      </View>
      <Text style={[styles.title, toRN(resolved)]}>{title}</Text>
    </InkWell>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: MIN_VERTICAL_PADDING,
  },
  leading: { alignItems: 'flex-start' },
  // Grows over the rest of the row, but keeps its natural width as its basis so a shrink-wrapped
  // parent (the popup menu measuring its IntrinsicWidth) sees the text's own width.
  title: { flexGrow: 1, flexShrink: 1, includeFontPadding: false },
});
