// Port of frontend/lib/screens/devices/add_device/add_device_screen.dart: Add Hub, from the Hubs
// screen's + button and ⋮ menu. Its logic is in addDeviceBloc.ts.
//
// AppScaffold, actions: a 50-wide gap. Body: PopScope (Back → the Hubs list) → Expanded →
// SafeArea → padding across of 15 % of the width each side when wider than 500, else 15 →
// scroll → 25, then a centred column:
// - ← (onSurfaceVariant) at the left → the Hubs list;
// - "Enter Hub Information" (24, bold), 50;
// - the yellow tile (radius 10, padding 40 across and 20 down): qr_code_scanner_rounded (160,
//   black), 20, "Tap To Scan QR Code" (black). A tap opens the scanner;
// - 50, then the fields. Before the MAC field is shown: Hub Name, and a 73-high gap. Once shown:
//   Hub Name, 25, the Mac Address field, 25. The name field is a new one each time (Flutter
//   builds it in a different place), so its validation starts over;
// - Submit (yellow, black title, FA circleCheck, 25 below), enabled while both fields have text;
//   the RoundedLoader instead while submitting;
// - before the MAC field is shown, "Tap to Add Mac Address Manually" (blue) under Submit, which
//   shows it: editable when the MAC is empty (it always is by then).
// Hub Name says "Device name cannot be empty." once emptied after the field was focused; the MAC
// field says "Mac address cannot be empty.". The MAC field upper-cases what is typed and masks it
// as XX:XX:XX:XX:XX:XX (hex digits only, separators added as the next digit comes); a scanned MAC
// is shown as the scanner read it. While it is not editable (scanned), tapping it asks "Change
// Mac Address", whose Okay makes it editable.

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../../components/buttons/IconButton';
import { RoundedButton } from '../../../components/buttons/RoundedButton';
import { TextFieldWithPostChangeValidators } from '../../../components/forms/TextFieldWithPostChangeValidators';
import { Icon } from '../../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../../components/icons/iconData';
import { AppScaffold } from '../../../components/layout/AppScaffold';
import { PopScope } from '../../../components/layout/PopScope';
import { RevealingScrollView } from '../../../components/layout/RevealingScrollView';
import { SafeArea } from '../../../components/layout/SafeArea';
import { RoundedLoader } from '../../../components/RoundedLoader';
import { CapitalizationFormatter } from '../../../services/textInputFormatters';
import { GoToDevicesHomeScreen } from '../../../state/devices/devicesBloc';
import { useReadDevicesBloc } from '../../../state/devices/DevicesBlocContext';
import {
  ColorScheme,
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../../theme/typography';
import { useLayoutWidth } from '../../../utilities/layoutWidth';
import {
  MaskAutoCompletionType,
  MaskTextInputFormatter,
} from '../../../utilities/maskTextInputFormatter';
import { useValueListenable } from '../../../utilities/valueNotifier';
import {
  AddDeviceBloc,
  AddDeviceShowingMacAddressFieldState,
  AddDeviceShowMacAddressEvent,
  AddDeviceStartScanningEvent,
  AddDeviceSubmitEvent,
  AddDeviceWarnAboutEditingEvent,
} from './addDeviceBloc';

const nameValidators = [
  (value: string) =>
    value.length === 0 ? 'Device name cannot be empty.' : null,
];
const macValidators = [
  (value: string) =>
    value.length === 0 ? 'Mac address cannot be empty.' : null,
];

export function AddDevice() {
  const readDevicesBloc = useReadDevicesBloc();
  const mounted = useRef(true);
  const [bloc] = useState(
    () =>
      new AddDeviceBloc({
        get mounted() {
          return mounted.current;
        },
        readDevicesBloc: () => readDevicesBloc(),
      }),
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      bloc.close();
    };
  }, [bloc]);
  const state = useSyncExternalStore(bloc.subscribe, bloc.getState);
  const name = useValueListenable(bloc.name);
  const macAdd = useValueListenable(bloc.macAdd);
  const [width, onLayout] = useLayoutWidth();
  const showingMac = state instanceof AddDeviceShowingMacAddressFieldState;
  // Flutter makes the formatters in the build that each new state causes.
  const macFormatters = useMemo(
    () => [
      new CapitalizationFormatter(),
      new MaskTextInputFormatter({
        mask: 'XX:XX:XX:XX:XX:XX',
        filter: { X: /[0-9a-fA-F]/ },
        type: MaskAutoCompletionType.lazy,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const toHubs = () => {
    readDevicesBloc().add(new GoToDevicesHomeScreen());
  };
  const isReadyToSubmit = macAdd.length > 0 && name.length > 0;
  const padding = { paddingHorizontal: width > 500 ? width * 0.15 : 15 };

  return (
    <AppScaffold
      actions={<View style={styles.actionsGap} />}
      body={
        <PopScope canPop onPopInvoked={toHubs}>
          <SafeArea style={styles.expanded}>
            <View style={[styles.expanded, padding]} onLayout={onLayout}>
              <RevealingScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.gap25} />
                <View style={styles.column}>
                  <View style={styles.backRow}>
                    <IconButton
                      icon={FontAwesomeIcons.arrowLeftLong}
                      color={ColorScheme.onSurfaceVariant}
                      onPressed={toHubs}
                    />
                  </View>
                  <Text style={headerText}>Enter Hub Information</Text>
                  <View style={styles.gap50} />
                  <Pressable
                    testID="scan-qr-tile"
                    android_disableSound
                    onPress={() => bloc.add(new AddDeviceStartScanningEvent())}
                  >
                    <View style={styles.tile}>
                      <Icon
                        icon={Icons.qr_code_scanner_rounded}
                        size={160}
                        color={MaterialColors.black}
                      />
                      <View style={styles.gap20} />
                      <Text style={tileText}>Tap To Scan QR Code</Text>
                    </View>
                  </Pressable>
                  <View style={styles.gap50} />
                  {!showingMac && (
                    <View key="name-alone" style={styles.stretch}>
                      <TextFieldWithPostChangeValidators
                        testID="hubName"
                        controller={bloc.name}
                        labelText="Hub Name"
                        validatorsToRunAfterFirstEdit={nameValidators}
                      />
                    </View>
                  )}
                  {showingMac ? (
                    <View key="name-and-mac" style={styles.stretch}>
                      <TextFieldWithPostChangeValidators
                        testID="hubName"
                        controller={bloc.name}
                        labelText="Hub Name"
                        validatorsToRunAfterFirstEdit={nameValidators}
                      />
                      <View style={styles.gap25} />
                      <View style={styles.macPadding}>
                        <Pressable
                          testID="mac-field-tap"
                          android_disableSound
                          // An editable field wins the tap (TextField's recognizer is deeper).
                          disabled={state.macAddressEditable}
                          onPress={() =>
                            bloc.add(new AddDeviceWarnAboutEditingEvent())
                          }
                        >
                          <TextFieldWithPostChangeValidators
                            testID="macAddress"
                            enabled={state.macAddressEditable}
                            controller={bloc.macAdd}
                            inputFormatters={macFormatters}
                            labelText="Mac Address"
                            decorationErrorText={
                              state.validMacAddress
                                ? null
                                : 'Mac Address cannot be empty'
                            }
                            validatorsToRunAfterFirstEdit={macValidators}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.gap73} />
                  )}
                  {state.isLoading === false ? (
                    <RoundedButton
                      onPressed={
                        isReadyToSubmit
                          ? () => {
                              bloc.add(
                                new AddDeviceSubmitEvent(bloc.macAdd.value),
                              );
                            }
                          : null
                      }
                      padding={styles.submitPadding}
                      title="Submit"
                      buttonColor={kCartellYellow}
                      buttonTitleColor={kCartellBlack}
                      icon={FontAwesomeIcons.circleCheck}
                      iconColor={kCartellBlack}
                    />
                  ) : (
                    <RoundedLoader />
                  )}
                  {!showingMac && (
                    <Pressable
                      testID="add-mac-manually"
                      android_disableSound
                      onPress={() =>
                        bloc.add(
                          new AddDeviceShowMacAddressEvent(
                            bloc.macAdd.value.length === 0,
                          ),
                        )
                      }
                    >
                      <Text style={manualText}>
                        Tap to Add Mac Address Manually
                      </Text>
                    </Pressable>
                  )}
                </View>
              </RevealingScrollView>
            </View>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const headerText = {
  ...toRN(merge(ambientTextStyle, { fontSize: 24, fontWeight: 'bold' })),
  includeFontPadding: false,
};
const tileText = {
  ...toRN(merge(ambientTextStyle, { color: MaterialColors.black })),
  includeFontPadding: false,
};
const manualText = {
  ...toRN(merge(ambientTextStyle, { color: kCartellBlue })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  actionsGap: { width: 50 },
  column: { alignItems: 'center' },
  backRow: { alignSelf: 'flex-start' },
  stretch: { alignSelf: 'stretch' },
  tile: {
    borderRadius: 10,
    backgroundColor: kCartellYellow,
    paddingHorizontal: 40,
    paddingVertical: 20,
    alignItems: 'center',
  },
  macPadding: { paddingBottom: 25 },
  // RoundedButton's padding replaced: 25 below only.
  submitPadding: { paddingBottom: 25 },
  gap20: { height: 20 },
  gap25: { height: 25 },
  gap50: { height: 50 },
  gap73: { height: 73 },
});
