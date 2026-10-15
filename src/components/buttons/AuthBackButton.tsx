// The back button on Login and Registration: Flutter's
// `Padding(v24, h8) → FloatingActionButton(tooltip 'Back', backgroundColor: transparent,
// child: Icon(FontAwesomeIcons.arrowLeftLong))` at FloatingActionButtonLocation.startTop (placed by
// the Scaffold). With the fill transparent, the FAB's elevation shadow shows as a soft dark rounded
// square around and behind the pale lavender arrow (FloatingActionButton.tsx).
// - tooltip 'Back': a long press shows it (and cancels the tap) rather than going back.
// - startTop with no app bar puts the FAB at x = 16 + left inset, y = top safe-area inset; the
//   padding here then puts the button at (24, inset + 24).
// Disabled (onPressed null) while a request is in flight.

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '../icons/Icon';
import { FontAwesomeIcons } from '../icons/iconData';
import {
  FloatingActionButton,
  kFabForegroundColor,
} from './FloatingActionButton';

export function AuthBackButton({
  onPressed,
}: {
  onPressed: (() => void) | null;
}) {
  return (
    <View style={styles.padding}>
      <FloatingActionButton
        onPressed={onPressed}
        backgroundColor="transparent"
        tooltip="Back"
      >
        <Icon
          icon={FontAwesomeIcons.arrowLeftLong}
          color={kFabForegroundColor}
        />
      </FloatingActionButton>
    </View>
  );
}

const styles = StyleSheet.create({
  padding: { paddingVertical: 24, paddingHorizontal: 8 },
});
