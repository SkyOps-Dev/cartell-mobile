// Port of frontend/lib/screens/account/edit_name.dart (spec 11 §3).
//
// AppScaffold, actions: X → Account Settings. Back does the same (PopScope canPop false), and so
// does ←. Nothing is saved on the way out.
// Body: Expanded → SafeArea → LayoutBuilder → scroll → Column(centre):
//   padding 10/25/0/0 → ← at the left;
//   Row(centre)[Column(centre)[padding 15/0/15/20 → CircleAvatar(50), padding v20 →
//     "Account Settings" (20, amber, bold, centred, at most 2 lines)]];
//   padding h (15 % of the width above 500, else 15) → Column(stretch)[padding left 10 →
//     "Enter Your Name." (14 bold), 25, First Name, 25, Last Name, padding v10 → Submit (blue,
//     FA circleCheck)].
// The fields start from the user in hand. Submit sends both names and goes back to Account
// Settings at once, without waiting: the screen may still show the old name, and a failed save is
// never shown (quirk Q6). Empty names are not checked (the error flags are hard-coded off).

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { CircleAvatar } from '../../components/CircleAvatar';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import type { User } from '../../models/user';
import { reportError } from '../../services/reportError';
import { updateUserData } from '../../services/requests/userRequests';
import { GoToAccountSettingsScreen } from '../../state/mainApp/mainAppBloc';
import { useMainAppBloc } from '../../state/mainApp/MainAppBlocContext';
import {
  ColorScheme,
  kAppBarActionsIconColor,
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { useLayoutWidth } from '../../utilities/layoutWidth';

export function EditName({ user }: { user: User }) {
  const bloc = useMainAppBloc();
  // setData(): the fields start from the user in hand (c5911 if that fails; it cannot here).
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [width, onLayout] = useLayoutWidth();
  // LayoutBuilder: 15 % of the width each side above 500, else 15.
  const formPadding = {
    paddingHorizontal: width > 500 ? width * 0.15 : 15,
  };
  const goBack = () => bloc.add(new GoToAccountSettingsScreen());

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={goBack}
        />
      }
      body={
        <PopScope canPop={false} onPopInvoked={goBack}>
          <SafeArea style={styles.expanded}>
            <View style={styles.expanded} onLayout={onLayout}>
              <ScrollView contentContainerStyle={styles.column}>
                <View style={styles.backPadding}>
                  <IconButton
                    icon={FontAwesomeIcons.arrowLeftLong}
                    color={ColorScheme.onSurfaceVariant}
                    onPressed={goBack}
                  />
                </View>
                <View style={styles.avatarColumn}>
                  <View style={styles.avatarPadding}>
                    <CircleAvatar radius={50} />
                  </View>
                  <View style={styles.titlePadding}>
                    <Text style={titleStyle} numberOfLines={2}>
                      Account Settings
                    </Text>
                  </View>
                </View>
                <View style={[styles.form, formPadding]}>
                  <View style={styles.promptPadding}>
                    <Text style={promptStyle}>Enter Your Name.</Text>
                  </View>
                  <View style={styles.gap25} />
                  <OutlinedTextField
                    testID="firstName"
                    labelText="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                  <View style={styles.gap25} />
                  <OutlinedTextField
                    testID="lastName"
                    labelText="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                  <RoundedButton
                    stretch
                    padding={styles.buttonPadding}
                    onPressed={() => {
                      // Not awaited (Q6); a failure was an uncaught error in Flutter.
                      updateUserData({
                        body: { first_name: firstName, last_name: lastName },
                      }).catch(reportError);
                      bloc.add(new GoToAccountSettingsScreen());
                    }}
                    title="Submit"
                    buttonColor={kCartellBlue}
                    buttonTitleColor={kCartellBlack}
                    icon={FontAwesomeIcons.circleCheck}
                    iconColor={kCartellBlack}
                  />
                </View>
              </ScrollView>
            </View>
          </SafeArea>
        </PopScope>
      }
    />
  );
}

const titleStyle = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 20,
      color: kCartellYellow,
      fontWeight: 'bold',
    }),
  ),
  textAlign: 'center' as const,
  includeFontPadding: false,
};
const promptStyle = {
  ...toRN(merge(ambientTextStyle, { fontSize: 14, fontWeight: 'bold' })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  column: { alignItems: 'center' },
  backPadding: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    paddingLeft: 10,
    paddingTop: 25,
  },
  avatarColumn: { alignItems: 'center', flexShrink: 1 },
  avatarPadding: { paddingLeft: 15, paddingRight: 15, paddingBottom: 20 },
  titlePadding: { paddingVertical: 20 },
  form: { alignSelf: 'stretch' },
  promptPadding: { paddingLeft: 10 },
  gap25: { height: 25 },
  buttonPadding: { paddingVertical: 10 + 8 },
});
