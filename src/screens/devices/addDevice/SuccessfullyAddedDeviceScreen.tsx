// Port of frontend/lib/screens/devices/add_device/successfully_added_device_screen.dart: shown
// once Add Hub has registered a hub.
//
// A plain Scaffold (no app bar, no side menu) → PopScope (Back → the new hub's page) → SafeArea →
// scroll → padding across of 15 % of the width each side when wider than 500 → a centred column:
// 65, "Hub Added to Account!" (20, white, bold), 20, FA circleCheck (150, amber), 20, "Your hub is
// now added to your account." (16), 20, "Next, we will pair the hub to your Wi-Fi. Are you ready
// to proceed?" (16; both 14 in from each side, centred), 20, then two RoundedButtons 20 in from
// each side with 10 between: "Proceed and Pair To Wi-Fi" (amber, black title, FA check) and
// "Pair to Wi-Fi Later" (blue, black title) → the new hub's page.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../../components/buttons/RoundedButton';
import { Icon } from '../../../components/icons/Icon';
import { FontAwesomeIcons } from '../../../components/icons/iconData';
import { PopScope } from '../../../components/layout/PopScope';
import { SafeArea } from '../../../components/layout/SafeArea';
import { Scaffold } from '../../../components/layout/Scaffold';
import type { Device } from '../../../models/device';
import { GoToSpecificDeviceEvent } from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../../theme/typography';
import { useLayoutWidth } from '../../../utilities/layoutWidth';

export function SuccessfullyAddedDeviceScreen({ device }: { device: Device }) {
  const readDevicesBloc = useReadDevicesBloc();
  const [width, onLayout] = useLayoutWidth();
  const padding = { paddingHorizontal: width > 500 ? width * 0.15 : 0 };
  const toHub = () => {
    readDevicesBloc().add(new GoToSpecificDeviceEvent(device));
  };
  return (
    <Scaffold>
      <PopScope canPop onPopInvoked={toHub}>
        <SafeArea style={styles.expanded}>
          <ScrollView>
            <View onLayout={onLayout} style={[styles.column, padding]}>
              <View style={styles.gap65} />
              <Text style={titleText}>Hub Added to Account!</Text>
              <View style={styles.gap20} />
              <Icon
                icon={FontAwesomeIcons.circleCheck}
                size={150}
                color={kCartellYellow}
              />
              <View style={styles.gap20} />
              <View style={styles.textPadding}>
                <Text style={bodyText}>
                  Your hub is now added to your account.
                </Text>
              </View>
              <View style={styles.gap20} />
              <View style={styles.textPadding}>
                <Text style={bodyText}>
                  Next, we will pair the hub to your Wi-Fi. Are you ready to
                  proceed?
                </Text>
              </View>
              <View style={styles.gap20} />
              <View style={styles.buttonPadding}>
                <RoundedButton
                  onPressed={() => {
                    // PORT-GAP: context.read<DevicesBloc>().add(GoToConnectHubBloc(device: device))
                    // opens Wi-Fi pairing (connect_hub_to_wifi/), which is not built yet, so
                    // nothing happens.
                  }}
                  title="Proceed and Pair To Wi-Fi"
                  buttonTitleColor={MaterialColors.black}
                  buttonColor={kCartellYellow}
                  icon={FontAwesomeIcons.check}
                  iconColor={kCartellBlack}
                />
              </View>
              <View style={styles.gap10} />
              <View style={styles.buttonPadding}>
                <RoundedButton
                  onPressed={toHub}
                  title="Pair to Wi-Fi Later"
                  buttonTitleColor={MaterialColors.black}
                  buttonColor={kCartellBlue}
                />
              </View>
            </View>
          </ScrollView>
        </SafeArea>
      </PopScope>
    </Scaffold>
  );
}

const titleText = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 20,
      color: MaterialColors.white,
      fontWeight: 'bold',
    }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const bodyText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 16 })),
  textAlign: 'center' as const,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { alignItems: 'center' },
  textPadding: { paddingHorizontal: 14 },
  buttonPadding: { paddingHorizontal: 20 },
  gap10: { height: 10 },
  gap20: { height: 20 },
  gap65: { height: 65 },
});
