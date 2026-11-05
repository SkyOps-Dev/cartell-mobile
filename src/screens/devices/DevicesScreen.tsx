// Port of frontend/lib/screens/devices/devices_screen.dart (spec 10 §2): the Hubs screen, the
// first screen after signing in.
//
// AppScaffold with:
// - the yellow + floating action button (FA plus, black) at the bottom right → Add Hub;
// - the ⋮ menu (Ellipsis) as the app bar's action, whose one item is Add Hub too;
// - body: Expanded → SafeArea → TimedPullToRefresh (pulled down: RefreshDevices) → scroll →
//   Column(stretch):
//   - padding 15 above and below a centred block: "Hubs" (Source Sans Pro, bold, 32, letter-spacing
//     2) and, 5 below, "View existing HUBs or add a HUB" (Source Sans Pro, 20); both on the body
//     text style otherwise (bodyMedium: height 1.43, onSurface);
//   - with no hubs: 35, then a ReusableCard (#1D1E33, padding 25) at most 300 wide while the
//     text-scale factor at 15 is under 1.25: "No Hubs have been added." (17, white, padding
//     5/5/5/10), the satellite dish (100, white: the dark theme's icon colour), "Press the plus
//     button below to get started." (padding 5/10/5/5);
//   - with hubs: a centred one-column grid (GridView.count, square tiles, no spacing), at most 300
//     wide while the scaling factor at 15 is under 1.5, clipped to its bounds as a scroll view is.
//     Each tile: a Badge (red, 40, shown when a sensor is blacklisted) over Padding(10) and a
//     ReusableCard whose Column is centred: the name (17, white, scrolling sideways if long),
//     Padding(10) and HUB.png 150 high (or, for a blacklisted hub, the amber warning, 175, deep
//     orange), 10, then a sideways-scrolling row: the broadcast tower (24; yellow when connected,
//     else dark gray), 15, "Status: Blacklisted" / "Status: Connected" / "Status: Disconnected"
//     on the body text style;
//   - 35.
// The body listens to DataPersistor<Device> (ListenableBuilder), so a hub re-fetched anywhere
// redraws its card.
// Android Back asks "Leave App"; Leave sends the app to the background (SystemNavigator.pop,
// measured 2026-10-15: the activity stays alive) and does not close the popup, so it is still open
// when the app comes back (quirk Q51). Nevermind closes it. On iOS Leave does nothing.
// Measured on the Flutter app (RMX5070, 2026-10-15): card x 90–990, top row 710.

import React from 'react';
import {
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Badge } from '../../components/Badge';
import { FloatingActionButton } from '../../components/buttons/FloatingActionButton';
import { Ellipsis } from '../../components/Ellipsis';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { showPopupMessage } from '../../components/popups/popups';
import { ReusableCard } from '../../components/ReusableCard';
import { FakeBoldText } from '../../components/text/FakeBoldText';
import { TimedPullToRefresh } from '../../components/TimedPullToRefresh';
import type { Device } from '../../models/device';
import { devicePersistor } from '../../services/data/persistors';
import {
  GoToAddAHubScreen,
  GoToSpecificDeviceEvent,
  RefreshDevices,
} from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import {
  kActiveCardColor,
  kCartellDarkGray,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import {
  ambientTextStyle,
  kSourceSansPro,
  merge,
  toRN,
} from '../../theme/typography';
import { useListenable } from '../../utilities/changeNotifier';
import { useScalingFactor } from '../../utilities/scaling';

const hubImage = require('../../../assets/images/HUB.png');
// HUB.png is 2429 x 2013 with no resolution variants, so Flutter sizes it in logical pixels.
const HUB_IMAGE_ASPECT = 2429 / 2013;

export function DevicesScreen({ devices }: { devices: Device[] }) {
  // PORT-GAP: initState runs fullLogin() on every mount: NotificationApi.init(), then
  // sendFCMToken().
  useListenable(devicePersistor);
  const scale = useScalingFactor(15);
  const readDevicesBloc = useReadDevicesBloc();

  // The bloc owns the list: RefreshDevices re-fetches and emits a fresh Hubs state (no loading
  // screen), which redraws this screen. The pull's spinner does not wait for the fetch.
  const refreshDevices = async () => {
    readDevicesBloc().add(new RefreshDevices());
  };

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
              readDevicesBloc().add(new GoToAddAHubScreen());
            }}
          >
            <Icon icon={FontAwesomeIcons.plus} color={MaterialColors.black} />
          </FloatingActionButton>
        }
        actions={<Ellipsis />}
        body={
          <SafeArea style={styles.expanded}>
            <TimedPullToRefresh onRefresh={refreshDevices} testID="hubs-list">
              <View style={styles.titleBlock}>
                <FakeBoldText style={hubsTitle}>Hubs</FakeBoldText>
                <View style={styles.gap5} />
                <Text style={subtitle}>View existing HUBs or add a HUB</Text>
              </View>
              {devices.length === 0 ? (
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
              ) : (
                <View style={styles.gridCentre}>
                  <View
                    style={[styles.grid, scale < 1.5 && styles.maxWidth300]}
                  >
                    {devices.map(device => (
                      <HubCard key={device.id} device={device} />
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.gap35} />
            </TimedPullToRefresh>
          </SafeArea>
        }
      />
    </PopScope>
  );
}

/** One tile of the grid. */
function HubCard({ device }: { device: Device }) {
  const { isBlacklisted, isConnected } = device.device;
  const readDevicesBloc = useReadDevicesBloc();
  return (
    <Badge
      showBadge={device.hasBlacklistedSensor}
      contentWidth={40}
      contentHeight={40}
      padding={NO_PADDING}
      passthrough
      style={styles.tile}
    >
      <View style={styles.tilePadding}>
        <ReusableCard
          cardColor={kActiveCardColor}
          style={styles.hubCard}
          onPress={() => {
            readDevicesBloc().add(new GoToSpecificDeviceEvent(device));
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sideways}
          >
            <Text style={label}>{device.name}</Text>
          </ScrollView>
          <View style={styles.pictureBox}>
            {!isBlacklisted ? (
              <Image
                source={hubImage}
                fadeDuration={0}
                resizeMethod="resize"
                style={styles.hubImage}
              />
            ) : (
              <Icon
                icon={Icons.warning_amber_rounded}
                size={175}
                color={MaterialColors.deepOrange}
              />
            )}
          </View>
          <View style={styles.gap10} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sideways}
          >
            <View style={styles.statusRow}>
              <Icon
                icon={FontAwesomeIcons.towerBroadcast}
                color={isConnected ? kCartellYellow : kCartellDarkGray}
              />
              <View style={styles.gap15} />
              <Text numberOfLines={1} style={status}>
                {isBlacklisted
                  ? 'Status: Blacklisted'
                  : isConnected
                  ? 'Status: Connected'
                  : 'Status: Disconnected'}
              </Text>
            </View>
          </ScrollView>
        </ReusableCard>
      </View>
    </Badge>
  );
}

const NO_PADDING = { left: 0, top: 0, right: 0, bottom: 0 };

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

// The status line: the body text style as it is.
const status = { ...toRN(ambientTextStyle), includeFontPadding: false };

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
  gridCentre: { alignItems: 'center' },
  // A scroll view clips what it shows, so the badge's overhang past the grid is cut off.
  grid: { width: '100%', overflow: 'hidden' },
  tile: { aspectRatio: 1 },
  tilePadding: { flex: 1, padding: 10 },
  hubCard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sideways: { flexGrow: 0 },
  pictureBox: { padding: 10 },
  hubImage: { height: 150, aspectRatio: HUB_IMAGE_ASPECT },
  gap10: { height: 10 },
  gap15: { width: 15 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
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
