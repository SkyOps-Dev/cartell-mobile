// Port of frontend/lib/screens/devices/edit_device.dart (spec 10 §4): Rename Hub, from a hub's
// ⋮ menu.
//
// AppScaffold, actions: ✗ (FA xmark) → the hub's page (GoToSpecificDeviceEvent, which re-checks
// it). Back and ← do the same. Nothing is saved on the way out.
// Body: PopScope → Expanded → SafeArea → scroll → Column(stretch):
// - Padding(left 10) → ← at the left;
// - Padding(20 across) → Row[Padding(25 down) → Row[Padding(15, 10, 15, 20) → FA satelliteDish
//   (24, white), "Hub Settings" (20, amber, bold)]] (the header says Hub Settings on the rename
//   page, as in Flutter);
// - Padding(20 across) → Column(stretch)[ "Enter Your Hub Name." (20, bold), 25, the Hub Name
//   field (starting from the hub's name), 25, Padding(15 above, 5 below) → Submit (blue, black
//   title, FA circleCheck) ].
// Submit sends the field's text as the name (PATCH, on Node) and, once it succeeds, goes back to
// the hub's page, which fetches the hub again and shows the new name. A failure shows nothing and
// stays here (it was an uncaught error in Flutter); the button can be pressed again meanwhile.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import type { Device } from '../../models/device';
import { reportError } from '../../services/reportError';
import { updateDeviceData } from '../../services/requests/deviceRequests';
import { GoToSpecificDeviceEvent } from '../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';

export function EditDevice({ device }: { device: Device }) {
  const readDevicesBloc = useReadDevicesBloc();
  // TextEditingController(text: widget.device.name), set once in initState.
  const [name, setName] = useState(device.name);
  const backToHub = () => {
    readDevicesBloc().add(new GoToSpecificDeviceEvent(device));
  };

  const updateDevice = async () => {
    await updateDeviceData({ devid: device.id, body: { name } });
    // Since the name changed, the hub is fetched again on its page.
    backToHub();
  };

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={backToHub}
        />
      }
      body={
        <PopScope canPop onPopInvoked={backToHub}>
          <SafeArea style={styles.expanded}>
            <ScrollView>
              <View style={styles.backRow}>
                <IconButton
                  icon={FontAwesomeIcons.arrowLeftLong}
                  color={ColorScheme.onSurfaceVariant}
                  onPressed={backToHub}
                />
              </View>
              <View style={styles.headerPadding}>
                <View style={styles.headerRow}>
                  <View style={styles.iconPadding}>
                    <Icon
                      icon={FontAwesomeIcons.satelliteDish}
                      color={MaterialColors.white}
                    />
                  </View>
                  <Text style={headerText}>Hub Settings</Text>
                </View>
              </View>
              <View style={styles.form}>
                <Text style={promptText}>Enter Your Hub Name.</Text>
                <View style={styles.gap25} />
                <OutlinedTextField
                  testID="hubName"
                  labelText="Hub Name"
                  value={name}
                  onChangeText={setName}
                />
                <View style={styles.gap25} />
                <RoundedButton
                  stretch
                  padding={styles.buttonPadding}
                  onPressed={() => {
                    updateDevice().catch(reportError);
                  }}
                  title="Submit"
                  buttonColor={kCartellBlue}
                  buttonTitleColor={kCartellBlack}
                  icon={FontAwesomeIcons.circleCheck}
                  iconColor={kCartellBlack}
                />
              </View>
            </ScrollView>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const headerText = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 20,
      color: kCartellYellow,
      fontWeight: 'bold',
    }),
  ),
  includeFontPadding: false,
};
const promptText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 20, fontWeight: 'bold' })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  backRow: { paddingLeft: 10, alignItems: 'flex-start' },
  headerPadding: { paddingHorizontal: 20, flexDirection: 'row' },
  headerRow: {
    paddingVertical: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPadding: {
    paddingLeft: 15,
    paddingTop: 10,
    paddingRight: 15,
    paddingBottom: 20,
  },
  form: { paddingHorizontal: 20 },
  gap25: { height: 25 },
  // Padding(15 above, 5 below) around RoundedButton's own 8.
  buttonPadding: { paddingTop: 15 + 8, paddingBottom: 5 + 8 },
});
