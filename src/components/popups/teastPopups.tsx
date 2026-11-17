// Port of frontend/lib/components/teast_popups.dart (spec 13 §3, features/30): the banner Pair
// Sounder shows on a sensor's page, the only screen that uses this file. showInfo is never called
// and is not ported.
//
// showSuccess / showError: on the next event-loop turn (Timer.run), showAlert opens a general
// dialog (showGeneralDialog: barrier 50 % black, not dismissible by tapping, 200 ms fade; Android
// Back closes it) whose page is SafeArea → Padding(10 above) → Padding(10 below) → at the top
// centre a box (radius 10) as wide as the screen less 40 and a ninth of the screen tall, with
// Padding(5) → Row[Icon(30), 15, the message (white, on the body text style)], centred down.
// With shouldDismiss (always, here) it closes itself 4 s after it was built, if the screen that
// opened it is still there, by popping whatever is on top (Navigator.pop of the root navigator).
// If Back closed it first, Flutter's timer still pops the top route 4 s later; in RN that closes
// the top popup if there is one, and otherwise does nothing (PARITY_ISSUES P38).

import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { kCartellDarkGray, MaterialColors } from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { SafeArea } from '../layout/SafeArea';
import { Icon } from '../icons/Icon';
import { Icons, type IconData } from '../icons/iconData';
import { popPopup, showGeneralDialog } from './popups';

const DISMISS_MS = 4000;

type Options = {
  shouldDismiss?: boolean;
  /** `context.mounted` of the screen that opened it, read when the 4 s are up. */
  isMounted?: () => boolean;
};

/** showSuccess(context, message): dark gray, check_circle_outline in white. */
export function showSuccess(message: string, options: Options = {}): void {
  setTimeout(() => {
    showAlert(
      message,
      kCartellDarkGray,
      Icons.check_circle_outline,
      MaterialColors.white,
      options,
    );
  }, 0);
}

/** showError(context, message): dark gray, error_outline in white. */
export function showError(message: string, options: Options = {}): void {
  setTimeout(() => {
    showAlert(
      message,
      kCartellDarkGray,
      Icons.error_outline,
      MaterialColors.white,
      options,
    );
  }, 0);
}

function showAlert(
  message: string,
  color: string,
  icon: IconData,
  iconColor: string,
  { shouldDismiss = true, isMounted = () => true }: Options,
): void {
  let scheduled = false;
  showGeneralDialog({
    pageBuilder: () => {
      // The pageBuilder runs on every build; Flutter schedules a pop from each one. It is built
      // once here, which is what happens in Flutter while nothing rebuilds the route.
      if (shouldDismiss && !scheduled) {
        scheduled = true;
        setTimeout(() => {
          if (isMounted()) {
            popPopup();
          }
        }, DISMISS_MS);
      }
      return (
        <Banner
          message={message}
          color={color}
          icon={icon}
          iconColor={iconColor}
        />
      );
    },
  });
}

function Banner({
  message,
  color,
  icon,
  iconColor,
}: {
  message: string;
  color: string;
  icon: IconData;
  iconColor: string;
}) {
  // MediaQuery.of(context).size: the whole screen, not the safe area.
  const window = useWindowDimensions();
  return (
    <SafeArea style={styles.fill}>
      <View style={styles.outer}>
        <View
          style={[
            styles.box,
            {
              backgroundColor: color,
              width: window.width - 40,
              height: window.height / 9,
            },
          ]}
        >
          <Icon icon={icon} size={30} color={iconColor} />
          <View style={styles.gap15} />
          <Text style={[messageText, styles.flexible]}>{message}</Text>
        </View>
      </View>
    </SafeArea>
  );
}

const messageText = {
  ...toRN(merge(ambientTextStyle, { color: MaterialColors.white })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  outer: { flex: 1, paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  box: {
    borderRadius: 10,
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gap15: { width: 15 },
  flexible: { flexShrink: 1 },
});
