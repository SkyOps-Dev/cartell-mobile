// Port of frontend/lib/screens/devices/devices_screen.dart (spec 10 §2): the Hubs screen, the
// first screen after signing in.
//
// AppScaffold with:
// - the yellow + floating action button (FA plus, black) at the bottom right;
// - the ⋮ menu (Ellipsis) as the app bar's action;
// - body: Expanded → SafeArea → scroll → Column(stretch):
//   - padding 15 above and below a centred block: "Hubs" (Source Sans Pro, bold, 32, letter-spacing
//     2) and, 5 below, "View existing HUBs or add a HUB" (Source Sans Pro, 20); both on the body
//     text style otherwise (bodyMedium: height 1.43, onSurface);
//   - with no hubs: 35, then a ReusableCard (#1D1E33, padding 25) at most 300 wide while the
//     text-scale factor at 15 is under 1.25: "No Hubs have been added." (17, white, padding
//     5/5/5/10), the satellite dish (100, white: the dark theme's icon colour), "Press the plus
//     button below to get started." (padding 5/10/5/5);
//   - 35.
// Android Back asks "Leave App"; Leave sends the app to the background (SystemNavigator.pop,
// measured 2026-10-15: the activity stays alive) and does not close the popup, so it is still open
// when the app comes back (quirk Q51). Nevermind closes it. On iOS Leave does nothing.
// Measured on the Flutter app (RMX5070, 2026-10-15): card x 90–990, top row 710.

import React from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FloatingActionButton } from '../../components/buttons/FloatingActionButton';
import { Ellipsis } from '../../components/Ellipsis';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { showPopupMessage } from '../../components/popups/popups';
import { ReusableCard } from '../../components/ReusableCard';
import { FakeBoldText } from '../../components/text/FakeBoldText';
import type { RawDevice } from '../../services/requests/deviceRequests';
import {
  kActiveCardColor,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import {
  ambientTextStyle,
  kSourceSansPro,
  merge,
  toRN,
} from '../../theme/typography';
import { useScalingFactor } from '../../utilities/scaling';

export function DevicesScreen(_props: { devices: RawDevice[] }) {
  // PORT-GAP: initState runs fullLogin() on every mount: NotificationApi.init(), then
  // sendFCMToken().
  // PORT-GAP: the hub cards when `devices` is not empty (a one-column grid of square
  // ReusableCards: name, HUB.png or the blacklisted warning, the status row, the
  // blacklisted-sensor badge; GoToSpecificDeviceEvent on tap; max width 300 while the scaling
  // factor at 15 is under 1.5). Until then the screen always shows the empty card (the developer,
  // 2026-10-15), and DataPersistor<Device>'s ListenableBuilder around the body.
  const scale = useScalingFactor(15);

  const leaveApp = () => {
    showPopupMessage({
      title: 'Leave App',
      message: 'Are you sure you want to leave this app?',
      cancelButtonLabel: 'Nevermind',
      showCancel: true,
      okayButtonLabel: 'Leave',
      onOkay: () => {
        BackHandler.exitApp();
      },
    });
  };

  return (
    <PopScope
      canPop={false}
      onPopInvoked={didPop => {
        if (didPop) {
          return;
        }
        leaveApp();
      }}
    >
      <AppScaffold
        floatingActionButton={
          <FloatingActionButton
            backgroundColor={kCartellYellow}
            onPressed={() => {
              // PORT-GAP: context.read<DevicesBloc>().add(GoToAddAHubScreen()).
            }}
          >
            <Icon icon={FontAwesomeIcons.plus} color={MaterialColors.black} />
          </FloatingActionButton>
        }
        actions={<Ellipsis />}
        body={
          <SafeArea style={styles.expanded}>
            {/* PORT-GAP: TimedPullToRefresh around the scroll view (liquid_pull_to_refresh
                3.0.1: amber on #25282A, height 40, animSpeedFactor 5; waits 2 s, then adds
                RefreshDevices). */}
            <ScrollView>
              <View style={styles.titleBlock}>
                <FakeBoldText style={hubsTitle}>Hubs</FakeBoldText>
                <View style={styles.gap5} />
                <Text style={subtitle}>View existing HUBs or add a HUB</Text>
              </View>
              <View style={styles.emptyColumn}>
                <View style={styles.gap35} />
                <ReusableCard
                  cardColor={kActiveCardColor}
                  style={[styles.card, scale < 1.25 && styles.maxWidth300]}
                >
                  <View style={styles.cardPadding}>
                    <Text style={[label, styles.firstLabel]}>
                      No Hubs have been added.
                    </Text>
                    <Icon
                      icon={FontAwesomeIcons.satelliteDish}
                      size={100}
                      color={MaterialColors.white}
                    />
                    <Text style={[label, styles.secondLabel]}>
                      Press the plus button below to get started.
                    </Text>
                  </View>
                </ReusableCard>
              </View>
              <View style={styles.gap35} />
            </ScrollView>
          </SafeArea>
        }
      />
    </PopScope>
  );
}

// The body's DefaultTextStyle is bodyMedium in onSurface; each Text merges its own style over it.
const hubsTitle = {
  ...toRN(
    merge(ambientTextStyle, {
      fontFamily: kSourceSansPro,
      letterSpacing: 2,
      fontSize: 32,
    }),
  ),
  // Bold is drawn by FakeBoldText: the font has no bold face.
  fontWeight: 'normal' as const,
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const subtitle = {
  ...toRN(
    merge(ambientTextStyle, { fontFamily: kSourceSansPro, fontSize: 20 }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
// kLabelTextStyle: 17, white.
const label = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 17, color: MaterialColors.white }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  titleBlock: { paddingVertical: 15, alignItems: 'center' },
  gap5: { height: 5 },
  gap35: { height: 35 },
  emptyColumn: { alignItems: 'center' },
  // The card's last line wraps, and a wrapped Flutter Text takes all the width it is given, so the
  // card is as wide as it may be: 300, or the whole row.
  card: { width: '100%' },
  maxWidth300: { maxWidth: 300 },
  cardPadding: { padding: 25, alignItems: 'center' },
  firstLabel: {
    paddingLeft: 5,
    paddingTop: 5,
    paddingRight: 5,
    paddingBottom: 10,
  },
  secondLabel: {
    paddingLeft: 5,
    paddingTop: 10,
    paddingRight: 5,
    paddingBottom: 5,
  },
});
