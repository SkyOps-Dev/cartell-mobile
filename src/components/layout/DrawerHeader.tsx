// Port of material/user_accounts_drawer_header.dart and the DrawerHeader it builds on
// (drawer_header.dart, Flutter 3.41.9), as the NavBar uses them: one account picture, a name and
// an email, no other accounts, no details arrow.
//
// DrawerHeader: statusBar + 161 tall with a 1 dp outlineVariant line along its bottom (the line is
// inside the height), then an 8 dp margin. Inside: padding top 16 + statusBar, start 16, filled
// with the decoration colour. statusBar is the top padding where the header sits: the status bar
// in the drawer, 0 in the tablet rail (inside the Scaffold body, under the app bar).
// UserAccountsDrawerHeader then lays out, inside the left/right safe area:
// - the account picture: 72 × 72 at the top-left of the space above the details;
// - the details box, 56 tall at the bottom. The bottom line (the email, or the name when there is
//   no email) is centred 28 above the box's bottom; the name sits directly above the email and may
//   reach above the box. Each line has 2 dp of padding above and below, is one line and ends in
//   "…" when too long (DefaultTextStyle overflow ellipsis, no maxLines: the first line is cut).
// - Text: name primaryTextTheme.bodyLarge, email bodyMedium, both onSurface (#E6E0E9); the NavBar
//   sets fontSize 14 on each.
// Measured on the Flutter app (RMX5070, 2026-10-15): line at rows 587–589, avatar 216 px wide at
// x 48, name centred at row 428, email at 504.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorScheme } from '../../theme/colors';
import { M3, merge, toRN } from '../../theme/typography';
import { kDividerColor } from '../lists/Divider';
import { TopPaddingConsumedContext } from './SafeArea';

const HEADER_HEIGHT = 160 + 1; // _kDrawerHeaderHeight, bottom edge included
const DETAILS_HEIGHT = 56; // _kAccountDetailsHeight
const PICTURE_SIZE = 72;
const LINE_PADDING = 2;

const nameStyle = merge(
  { ...M3.bodyLarge, color: ColorScheme.onSurface },
  { fontSize: 14 },
);
const emailStyle = merge(
  { ...M3.bodyMedium, color: ColorScheme.onSurface },
  { fontSize: 14 },
);
const nameBox = nameStyle.fontSize * nameStyle.height + 2 * LINE_PADDING;
const emailBox = emailStyle.fontSize * emailStyle.height + 2 * LINE_PADDING;

type Props = {
  backgroundColor: string;
  picture: React.ReactNode;
  accountName: string;
  /** null leaves the email out (the NavBar does at large text sizes). */
  accountEmail: string | null;
};

export function UserAccountsDrawerHeader({
  backgroundColor,
  picture,
  accountName,
  accountEmail,
}: Props) {
  const insets = useSafeAreaInsets();
  const statusBar = React.useContext(TopPaddingConsumedContext)
    ? 0
    : insets.top;
  const bottomLineBox = accountEmail !== null ? emailBox : nameBox;
  const bottomLineTop =
    DETAILS_HEIGHT - 0.5 * DETAILS_HEIGHT - 0.5 * bottomLineBox;
  return (
    <View style={[styles.header, { height: statusBar + HEADER_HEIGHT }]}>
      <View
        style={[
          styles.inner,
          {
            backgroundColor,
            paddingTop: 16 + statusBar,
            paddingLeft: 16 + insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.pictures}>
          <View style={styles.picture}>{picture}</View>
        </View>
        <View style={styles.details}>
          {accountEmail !== null && (
            <Text
              numberOfLines={1}
              style={[
                styles.line,
                toRN(nameStyle),
                { top: bottomLineTop - nameBox + LINE_PADDING },
              ]}
            >
              {accountName}
            </Text>
          )}
          <Text
            numberOfLines={1}
            style={[
              styles.line,
              toRN(accountEmail !== null ? emailStyle : nameStyle),
              { top: bottomLineTop + LINE_PADDING },
            ]}
          >
            {accountEmail ?? accountName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: kDividerColor,
  },
  inner: { flex: 1 },
  pictures: { flex: 1, paddingRight: 16 },
  picture: { width: PICTURE_SIZE, height: PICTURE_SIZE },
  details: { height: DETAILS_HEIGHT },
  line: {
    position: 'absolute',
    left: 0,
    maxWidth: '100%',
    includeFontPadding: false,
  },
});
