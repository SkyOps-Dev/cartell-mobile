// Port of frontend/lib/screens/account/edit_phone.dart (spec 11 §4).
//
// AppScaffold, actions: X → Account Settings; Back and ← do the same, saving nothing.
// On open the user is fetched twice, side by side, as Flutter's initState does: once for the
// screen (FutureBuilder) and once to fill the field (setData; c34bc if that fails). The form can
// therefore appear with an empty field that fills a moment later, overwriting anything typed.
// - Waiting: a centred spinner (36, primary).
// - Error: 855df is reported on every build, and padding 50 → centred FriendlyErrorView ("Your
//   session has expired. Please sign in again." for an expired session, else "Something went
//   wrong. Please try again."), with no buttons.
// - Data: ← (padding 10/25/0/0); padding v25 → [padding 15/10/15/20 → CircleAvatar(50),
//   "Account Settings" (20, amber, bold)]; padding h (15 % of the width above 500, else 15) →
//   Column(stretch)["Enter Your Phone Number." (14 bold), 25, Phone Number (the default keyboard),
//   25, Submit].
// Submit sends the number exactly as typed and goes back at once, without waiting (quirk Q6).

import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { CircleAvatar } from '../../components/CircleAvatar';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { FriendlyErrorView } from '../../components/FriendlyErrorView';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import { CircularProgressIndicator } from '../../components/progress/CircularProgressIndicator';
import type { User } from '../../models/user';
import {
  AccountInformationSetFailedException,
  NoAccountInformationFoundException,
} from '../../services/exceptions';
import { reportError } from '../../services/reportError';
import { setUser, updateUserData } from '../../services/requests/userRequests';
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
import { useFutureSnapshot } from '../../utilities/futureBuilder';
import { useLayoutWidth } from '../../utilities/layoutWidth';

/** `user` is the one in hand; like Flutter's screen, this one fetches its own. */
export function EditPhone(_props: { user: User }) {
  const bloc = useMainAppBloc();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [width, onLayout] = useLayoutWidth();
  // LayoutBuilder: 15 % of the width each side above 500, else 15.
  const formPadding = {
    paddingHorizontal: width > 500 ? width * 0.15 : 15,
  };

  // initState, once: futureUser = setUser(); setData();
  const started = useRef<Promise<User> | null>(null);
  if (started.current === null) {
    const futureUser = setUser();
    // Handled by the FutureBuilder below once it subscribes.
    futureUser.catch(() => undefined);
    started.current = futureUser;
    (async () => {
      try {
        const data = await setUser();
        setPhoneNumber(data.phoneNo ?? '');
      } catch {
        reportError(
          new AccountInformationSetFailedException('Error Code c34bc:'),
        );
      }
    })();
  }
  const snapshot = useFutureSnapshot(started.current);
  const goBack = () => bloc.add(new GoToAccountSettingsScreen());

  let content: React.ReactNode;
  if (snapshot.data !== null) {
    content = (
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
          <Text style={titleStyle} numberOfLines={2}>
            Account Settings
          </Text>
        </View>
        <View style={[styles.form, formPadding]}>
          <Text style={promptStyle}>Enter Your Phone Number.</Text>
          <View style={styles.gap25} />
          <OutlinedTextField
            testID="phone"
            labelText="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <View style={styles.gap25} />
          <RoundedButton
            stretch
            onPressed={() => {
              // Not awaited (Q6); a failure was an uncaught error in Flutter.
              updateUserData({ body: { phone_no: phoneNumber } }).catch(
                reportError,
              );
              bloc.add(new GoToAccountSettingsScreen());
            }}
            title="Submit"
            buttonColor={kCartellBlue}
            buttonTitleColor={kCartellBlack}
            iconColor={kCartellBlack}
            icon={FontAwesomeIcons.circleCheck}
          />
        </View>
      </ScrollView>
    );
  } else if (snapshot.hasError) {
    reportError(new NoAccountInformationFoundException('Error Code 855df:'));
    content = (
      <View style={styles.errorPadding}>
        <ScrollView
          style={styles.errorScroll}
          contentContainerStyle={styles.errorCenter}
        >
          <FriendlyErrorView error={snapshot.error} />
        </ScrollView>
      </View>
    );
  } else {
    content = (
      <View style={styles.center}>
        <CircularProgressIndicator />
      </View>
    );
  }

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
              {content}
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
  avatarColumn: { alignItems: 'center', flexShrink: 1, paddingVertical: 25 },
  avatarPadding: {
    paddingLeft: 15,
    paddingTop: 10,
    paddingRight: 15,
    paddingBottom: 20,
  },
  form: { alignSelf: 'stretch' },
  gap25: { height: 25 },
  // Padding(50) → Center → SingleChildScrollView: the view is centred and as tall as its
  // content, up to the space left.
  errorPadding: { flex: 1, padding: 50, justifyContent: 'center' },
  errorScroll: { flexGrow: 0 },
  errorCenter: { alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
