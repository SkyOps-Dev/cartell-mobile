// Port of frontend/lib/screens/account/account_settings.dart (spec 11 §2, §2.1; part 21, and the
// Delete Account flow of part 23).
//
// AppScaffold, actions: ⋮ → "Delete Account" (FA userXmark). Body: Expanded → SafeArea → scroll →
// Column(centre):
// 1. padding 10/25/30/0 → Row(spaceBetween)[← (to Hubs), ConditionalViewWidget(the server's
//    alexa_enabled setting) → Row["Connected Services: ", the Amazon logo if the profile has Alexa
//    linked]]. The setting is fetched again on every build of this screen (quirk Q34).
// 2. padding h10 → Column(centre):
//    - padding 15/0/15/35 → IconButton(FA userGear, blue, 50; does nothing);
//    - padding 15 → "Account Settings" (20, bold, amber);
//    - padding h2 → the rows, with amber Dividers (thickness 2; padding v14 between the four
//      ReusableListings, v10 after Phone, v5 after each switch):
//      Name ("first last" → Edit name), Email (no tap), Password ("Change" → Edit password),
//      Phone (formatted, or "Enter Phone Number" → Edit phone; a null phone throws: quirk Q30),
//      [Unlock with Biometrics], Receive Notifications, Receive Email Notifications.
//    Switch rows: padding h0 on iOS, h20 on Android → Row(spaceBetween)[Flexible(label, 14 white),
//    AutoSwitch].
// - The biometrics row shows when the phone has an enrolled biometric, or the preference is on,
//   or it could not be read: the only way back on after declining the offer, and off again.
// - The two notification switches get a new controller on every build, holding the value the
//   screen was opened with (as Flutter's build makes a new ValueNotifier each time).
// - Back and ← go to the Hubs screen.
// Not ported (dead in Flutter): the "Notification Settings" / "Email Notification Settings"
// popups, nothing calls them; and a second Delete Account button under Visibility(false).
//
// Delete Account (⋮): the menu closes; "Delete Account" asks for the password (the field keeps
// what was typed if the popup is opened again). Delete sends it; whatever the server says, the
// session is cleared and "Account Successfully Removed" shows over it (quirk Q2). Its Okay closes
// both popups and goes to the Welcome screen. A failed session check or no network: the first
// popup just stays open.

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { ConditionalViewWidget } from '../../components/ConditionalViewWidget';
import { AutoSwitch } from '../../components/forms/AutoSwitch';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { Divider } from '../../components/lists/Divider';
import { ListTile } from '../../components/lists/ListTile';
import {
  popMenu,
  PopupMenuButton,
  PopupMenuItem,
} from '../../components/popups/PopupMenu';
import { popPopup, showPopupMessage } from '../../components/popups/popups';
import { ReusableListing } from '../../components/ReusableListing';
import type { Profile } from '../../models/profile';
import type { User } from '../../models/user';
import { BiometricService } from '../../services/biometricService';
import { reportError } from '../../services/reportError';
import {
  alexaEnabledAccessKey,
  getSetting,
} from '../../services/requests/settingsRequests';
import {
  deleteAccount,
  setProfileNotificationPolicy,
  setUserEmailNotificationPolicy,
} from '../../services/requests/userRequests';
import { ResultOf } from '../../services/result';
import { SecureStorage } from '../../services/secureStorage';
import { GoToWelcomeScreenEvent } from '../../state/auth/authBloc';
import { useAuthBloc } from '../../state/auth/AuthBlocContext';
import {
  GoToAccountSettingsEditNameScreenEvent,
  GoToAccountSettingsEditPasswordScreenEvent,
  GoToAccountSettingsEditPhoneNumberScreenEvent,
  GoToHubsScreenEvent,
} from '../../state/mainApp/mainAppBloc';
import { useMainAppBloc } from '../../state/mainApp/MainAppBlocContext';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { dartTypeName } from '../../utilities/dartTypeName';
import { formatPhoneNumber } from '../../utilities/textFormatters';
import { ValueNotifier } from '../../utilities/valueNotifier';

type Props = { user: User; profile: Profile };

const onOff = (value: boolean) => (value ? 'on' : 'off');

export function AccountSettings({ user, profile }: Props) {
  const mainAppBloc = useMainAppBloc();
  const authBloc = useAuthBloc();
  // _pwdcontroller: lives as long as the screen, so the Delete popup reopens with the old text.
  const pwdController = useRef('');
  // _biometricsController starts false; the row stays hidden until the read lands.
  const biometricsController = useRef(new ValueNotifier(false)).current;
  const [showBiometricsRow, setShowBiometricsRow] = useState(false);
  // setState always rebuilds in Flutter, even with nothing changed (it refetches the Alexa
  // setting below); React would skip a render for an unchanged value.
  const [, rebuild] = useReducer((n: number) => n + 1, 0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const loadBiometricsPreference = async () => {
      let available = false;
      let enabled = false;
      let couldNotRead = false;
      try {
        available = await new BiometricService().isAvailable();
        enabled = (await SecureStorage.getBiometricsEnabled()) ?? false;
      } catch {
        // When the state is unknown, show the control rather than hide the way out.
        // LATER(part 2): _log.w("Could not read the biometric preference: $e").
        couldNotRead = true;
      }
      if (!mounted.current) {
        return;
      }
      biometricsController.value = enabled;
      setShowBiometricsRow(available || enabled || couldNotRead);
      rebuild();
    };
    loadBiometricsPreference();
    return () => {
      mounted.current = false;
    };
  }, [biometricsController]);

  const goToHubs = () => mainAppBloc.add(new GoToHubsScreenEvent());

  const showAlertDialogRemoveAccountSuccess = () => {
    showPopupMessage({
      title: 'Account Successfully Removed',
      message: 'Your account has been removed.',
      onOkay: () => {
        popPopup();
        authBloc.add(new GoToWelcomeScreenEvent());
        popPopup();
      },
    });
  };

  const showAlertDialogRemoveAccount = () => {
    popMenu();
    showPopupMessage({
      title: 'Delete Account',
      showCancel: true,
      message:
        'You are about to delete your account. Possible data loss can occur. If you are sure that you want to delete your account, please enter your password.',
      body: <DeletePasswordField controller={pwdController} />,
      okayButtonLabel: 'Delete',
      onOkay: () => {
        // An error here was uncaught in Flutter (reported, popup left open).
        (async () => {
          await deleteAccount({ password: pwdController.current });
          if (mounted.current) {
            showAlertDialogRemoveAccountSuccess();
          }
        })().catch(reportError);
      },
    });
  };

  // `user.phoneNo!` (quirk Q30): a user with no phone at all breaks the screen.
  if (user.phoneNo === null) {
    throw new TypeError('Null check operator used on a null value');
  }
  const phone = formatPhoneNumber(user.phoneNo) ?? 'Enter Phone Number';

  // New controllers on every build, as Flutter's build makes them.
  const notificationsController = new ValueNotifier(
    profile.shouldSendNotification,
  );
  const emailController = new ValueNotifier(user.shouldSendEmails);

  const amberDivider = (padding: number) => (
    <View style={[styles.stretch, { paddingVertical: padding }]}>
      <Divider thickness={2} color={kCartellYellow} />
    </View>
  );
  const switchRow = (
    label: string,
    controller: ValueNotifier<boolean>,
    processTap: (value: boolean) => Promise<ResultOf<string>>,
  ) => (
    <View style={[styles.switchRow, switchRowPadding]}>
      <View style={styles.flexible}>
        <Text style={switchLabelStyle}>{label}</Text>
      </View>
      <AutoSwitch boolController={controller} processTap={processTap} />
    </View>
  );

  return (
    <AppScaffold
      actions={
        <PopupMenuButton
          icon={FontAwesomeIcons.ellipsisVertical}
          color={kAppBarActionsIconColor}
          itemBuilder={() => [
            <PopupMenuItem key="delete-account">
              <ListTile
                leadingIcon={FontAwesomeIcons.userXmark}
                title="Delete Account"
                onTap={showAlertDialogRemoveAccount}
              />
            </PopupMenuItem>,
          ]}
        />
      }
      body={
        <PopScope canPop onPopInvoked={goToHubs}>
          <SafeArea style={styles.expanded}>
            <ScrollView contentContainerStyle={styles.column}>
              <View style={styles.topRow}>
                <IconButton
                  icon={FontAwesomeIcons.arrowLeftLong}
                  color={ColorScheme.onSurfaceVariant}
                  onPressed={goToHubs}
                />
                <ConditionalViewWidget
                  shouldRender={async () =>
                    (await getSetting({ settingKey: alexaEnabledAccessKey }))
                      .value
                  }
                >
                  <View style={styles.connectedServices}>
                    <Text style={ambientText}>Connected Services: </Text>
                    {profile.alexaEnabled && (
                      <Icon
                        icon={FontAwesomeIcons.amazon}
                        color={MaterialColors.white}
                      />
                    )}
                  </View>
                </ConditionalViewWidget>
              </View>
              <View style={styles.main}>
                <View style={styles.gearPadding}>
                  <IconButton
                    icon={FontAwesomeIcons.userGear}
                    color={kCartellBlue}
                    size={50}
                    onPressed={() => {}}
                  />
                </View>
                <View style={styles.titlePadding}>
                  <Text style={titleStyle}>Account Settings</Text>
                </View>
                <View style={styles.rows}>
                  <ReusableListing
                    onPress={() =>
                      mainAppBloc.add(
                        new GoToAccountSettingsEditNameScreenEvent(user),
                      )
                    }
                    listicon={FontAwesomeIcons.user}
                    iconcolor={kCartellBlue}
                    iconsize={20}
                    fontcolor={MaterialColors.white}
                    fontsize={14}
                    labelvalue="Name"
                    textvalue={`${user.firstName} ${user.lastName}`}
                  />
                  {amberDivider(14)}
                  <ReusableListing
                    listicon={FontAwesomeIcons.envelope}
                    iconcolor={kCartellBlue}
                    iconsize={20}
                    fontcolor={MaterialColors.white}
                    fontsize={14}
                    labelvalue="Email"
                    textvalue={user.email}
                  />
                  {amberDivider(14)}
                  <ReusableListing
                    onPress={() =>
                      mainAppBloc.add(
                        new GoToAccountSettingsEditPasswordScreenEvent(user),
                      )
                    }
                    listicon={FontAwesomeIcons.lock}
                    iconcolor={kCartellBlue}
                    iconsize={20}
                    fontcolor={MaterialColors.white}
                    fontsize={14}
                    labelvalue="Password"
                    textvalue="Change"
                  />
                  {amberDivider(14)}
                  <ReusableListing
                    onPress={() =>
                      mainAppBloc.add(
                        new GoToAccountSettingsEditPhoneNumberScreenEvent(user),
                      )
                    }
                    listicon={FontAwesomeIcons.phone}
                    iconcolor={kCartellBlue}
                    iconsize={20}
                    fontcolor={MaterialColors.white}
                    fontsize={14}
                    labelvalue="Phone"
                    textvalue={phone}
                  />
                  {amberDivider(10)}

                  {showBiometricsRow && (
                    <>
                      {switchRow(
                        'Unlock with Biometrics: ',
                        biometricsController,
                        async value => {
                          // A throw here would skip both the revert and the toast, so it
                          // becomes a failure.
                          try {
                            await SecureStorage.setBiometricsEnabled(value);
                          } catch {
                            // LATER(part 2): _log.w("Could not write the biometric preference: $e").
                            return ResultOf.failure({
                              message:
                                'Could not save that setting. Please try again.',
                            });
                          }
                          return ResultOf.success(
                            value
                              ? 'Cartell will ask for your fingerprint or face when it opens.'
                              : 'Biometric unlock turned off.',
                          );
                        },
                      )}
                      {amberDivider(5)}
                    </>
                  )}

                  {switchRow(
                    'Receive Notifications: ',
                    notificationsController,
                    async value => {
                      try {
                        await setProfileNotificationPolicy(value);
                        return ResultOf.success(
                          `Notifications turned ${onOff(value)}.`,
                        );
                      } catch (error) {
                        return ResultOf.failure({
                          message: `Error encountered of type: ${dartTypeName(
                            error,
                          )}. Notifications are still ${onOff(
                            !value,
                          )}. Please try again soon.`,
                        });
                      }
                    },
                  )}
                  {amberDivider(5)}

                  {switchRow(
                    'Receive Email Notifications: ',
                    emailController,
                    async value => {
                      try {
                        await setUserEmailNotificationPolicy(value);
                        return ResultOf.success(
                          `Email notifications turned ${onOff(value)}.`,
                        );
                      } catch (error) {
                        return ResultOf.failure({
                          message: `Error encountered of type: ${dartTypeName(
                            error,
                          )}. Email notifications are still ${onOff(
                            !value,
                          )}. Please try again soon.`,
                        });
                      }
                    },
                  )}
                  {amberDivider(5)}
                </View>
              </View>
            </ScrollView>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

/** The Delete popup's body: TextField(obscured, kTextFieldDecoration, hint "Enter your password"). */
function DeletePasswordField({
  controller,
}: {
  controller: React.MutableRefObject<string>;
}) {
  const [text, setText] = useState(controller.current);
  return (
    <View style={styles.stretch}>
      <OutlinedTextField
        value={text}
        onChangeText={next => {
          controller.current = next;
          setText(next);
        }}
        secureTextEntry
        hintText="Enter your password"
        notchColor={kCartellBlack}
        testID="delete-account-password"
      />
    </View>
  );
}

const ambientText = { ...toRN(ambientTextStyle), includeFontPadding: false };
const titleStyle = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 20,
      fontWeight: 'bold',
      color: kCartellYellow,
    }),
  ),
  includeFontPadding: false,
};
const switchLabelStyle = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 14, color: MaterialColors.white }),
  ),
  includeFontPadding: false,
};
const switchRowPadding = {
  paddingHorizontal: Platform.OS === 'ios' ? 0 : 20,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { alignItems: 'center' },
  stretch: { alignSelf: 'stretch' },
  topRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 10,
    paddingTop: 25,
    paddingRight: 30,
  },
  connectedServices: { flexDirection: 'row', alignItems: 'center' },
  main: { alignSelf: 'stretch', alignItems: 'center', paddingHorizontal: 10 },
  gearPadding: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 35,
  },
  titlePadding: { padding: 15 },
  rows: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  switchRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexible: { flexShrink: 1 },
});
