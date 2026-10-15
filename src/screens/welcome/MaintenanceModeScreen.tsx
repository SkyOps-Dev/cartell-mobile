// Port of frontend/lib/screens/welcome/maintenance_mode_screen.dart (spec 08 §8): the takeover
// shown while the server is down for maintenance, or cannot be reached at all.
//
// Scaffold → AppBar (#25282A, the logo as title, as the Loading screen) → SafeArea →
// ResponsiveSpacer → Center → SingleChildScrollView → Column(centre):
//   Icon(wifi when unreachable, else wrench; 100, the theme's white), 20,
//   Padding(h30, Text(message, centred, 20)), 12, TextButton('Retry').
// Retry probes the server at once (instead of waiting up to 15 s for the background check) and
// reports the result to the mode listeners; it is disabled while that probe runs. `onRetry` is a
// test seam that replaces the probe, as in Flutter.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextButton } from '../../components/buttons/TextButton';
import { CenteredSingleChildScrollView } from '../../components/layout/CenteredSingleChildScrollView';
import { AppBar, AppBarLogo } from '../../components/layout/AppBar';
import { ResponsiveSpacer } from '../../components/layout/ResponsiveSpacer';
import { SafeArea } from '../../components/layout/SafeArea';
import { Scaffold } from '../../components/layout/Scaffold';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { NetworkHelper } from '../../services/requests/networkHelper';
import { kCartellAppScaffoldColor, MaterialColors } from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { ModeWatcherHelper } from '../../utilities/modeWatcher';

const UNREACHABLE_MESSAGE =
  "We can't reach Cartell right now.\nCheck your internet connection and try again.";
const MAINTENANCE_MESSAGE =
  'The server is currently undergoing an update. Please check back later.';

type Props = {
  isUnreachable?: boolean;
  onRetry?: () => void;
};

export function MaintenanceModeScreen({
  isUnreachable = false,
  onRetry,
}: Props) {
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const retry = async () => {
    if (onRetry !== undefined) {
      onRetry();
      return;
    }
    if (retrying) {
      return;
    }
    setRetrying(true);
    try {
      const mode = await NetworkHelper.validateServerMode();
      ModeWatcherHelper.notifyListeners(mode);
    } finally {
      if (mounted.current) {
        setRetrying(false);
      }
    }
  };

  return (
    <Scaffold
      appBar={
        <AppBar
          title={<AppBarLogo />}
          backgroundColor={kCartellAppScaffoldColor}
        />
      }
    >
      <SafeArea style={styles.fill}>
        <ResponsiveSpacer>
          <CenteredSingleChildScrollView>
            <View style={styles.column}>
              <Icon
                icon={
                  isUnreachable
                    ? FontAwesomeIcons.wifi
                    : FontAwesomeIcons.wrench
                }
                size={100}
                color={MaterialColors.white}
              />
              <View style={styles.gap20} />
              <Text style={styles.message}>
                {isUnreachable ? UNREACHABLE_MESSAGE : MAINTENANCE_MESSAGE}
              </Text>
              <View style={styles.gap12} />
              <TextButton label="Retry" onPressed={retrying ? null : retry} />
            </View>
          </CenteredSingleChildScrollView>
        </ResponsiveSpacer>
      </SafeArea>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { alignItems: 'center' },
  gap20: { height: 20 },
  gap12: { height: 12 },
  message: {
    ...toRN(merge(ambientTextStyle, { fontSize: 20 })),
    marginHorizontal: 30,
    textAlign: 'center',
  },
});
