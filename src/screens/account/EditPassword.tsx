// Port of frontend/lib/screens/account/edit_password.dart (spec 11 §5).
//
// AppScaffold, actions: X → Account Settings, disabled while the request runs; Back and ← the
// same (Back is ignored while it runs).
// Body: Expanded → SafeArea → ModalProgressHUD → scroll → Column:
//   padding 10/25/0/0 → ←;
//   padding h20 → [padding v25 → Row[padding 15/0/15/20 → CircleAvatar(25), "Account Settings"
//     (20, amber, bold)], padding 10 → Column(stretch)[
//       "Edit Your Password." (20 bold), 16,
//       Current Password ("Enter your current password"), 16,
//       New Password ("Enter your new password"; checked as typed, unmet rules listed in red
//         #F44336 with a red border),
//       [16, Confirm New Password ("Re-enter your new password"): only while the new one passes;
//         cleared and hidden when it stops passing, kept when one passing password is edited
//         into another (quirk Q26)],
//       16, Submit (blue, FA circleCheck; disabled while the request runs)]].
//   Each field: white text, amber lock prefix, an eye button (white70, 18, no tooltip).
// Submit:
// - New and Confirm differ → "Passwords Do Not Match" / "Please make sure your new password and
//   confirmation match."; nothing is sent.
// - Else the HUD covers the screen while POST /auth/users/set_password/ runs.
//   - Under 300 → "Password Change Successful!" (empty message); Okay deletes the legacy password
//     key, closes the popup and goes to Account Settings. The user stays signed in.
//   - Any other answer → 38bcd and "An error occurred." / "Please try again. Contact support if
//     errors persist."; a thrown error → reported as it is, and the same popup.
// PORT-GAP: Flutter gives these fields empty autofill hints; check whether the phone's
// password manager offers to fill or save them, as it does for the Flutter app.

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { CircleAvatar } from '../../components/CircleAvatar';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import { AppScaffold } from '../../components/layout/AppScaffold';
import { PopScope } from '../../components/layout/PopScope';
import { SafeArea } from '../../components/layout/SafeArea';
import {
  popPopup,
  showGenericErrorPopup,
  showPopupMessage,
} from '../../components/popups/popups';
import { ModalProgressHUD } from '../../components/progress/ModalProgressHUD';
import type { User } from '../../models/user';
import { AccountInformationSetFailedException } from '../../services/exceptions';
import { reportError } from '../../services/reportError';
import type { HttpResponse } from '../../services/requests/networkHelper';
import { updateUserPassword } from '../../services/requests/userRequests';
import { SecureStorage } from '../../services/secureStorage';
import { GoToAccountSettingsScreen } from '../../state/mainApp/mainAppBloc';
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
import { validatePassword } from '../../utilities/passwordRules';

type Props = {
  user: User;
  /** The password change request. A parameter only so a test can hold it open. */
  setPassword?: (args: {
    body: Record<string, string>;
  }) => Promise<HttpResponse>;
};

export function EditPassword({ setPassword = updateUserPassword }: Props) {
  const bloc = useMainAppBloc();
  const [obscureTextOld, setObscureTextOld] = useState(true);
  const [obscureTextNew, setObscureTextNew] = useState(true);
  const [obscureTextConf, setObscureTextConf] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPwdError, setShowPwdError] = useState(false);
  const [pwdError, setPwdError] = useState('');
  // True while the request runs: hashing makes it take a second or two, and a second press
  // would send the old current password again and fail after the first succeeded.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setSubmitting = (value: boolean) => {
    submitting.current = value;
    setIsSubmitting(value);
  };
  const goBack = () => bloc.add(new GoToAccountSettingsScreen());

  const submit = async () => {
    if (submitting.current) {
      return;
    }
    if (newPwd !== confirmPwd) {
      showPopupMessage({
        title: 'Passwords Do Not Match',
        message: 'Please make sure your new password and confirmation match.',
        onOkay: () => popPopup(),
      });
      return;
    }
    setSubmitting(true);
    let res: HttpResponse;
    try {
      res = await setPassword({
        body: { current_password: oldPwd, new_password: newPwd },
      });
    } catch (error) {
      // The real cause, with its stack.
      reportError(error);
      if (!mounted.current) {
        return;
      }
      setSubmitting(false);
      showGenericErrorPopup();
      return;
    }
    if (!mounted.current) {
      return;
    }
    setSubmitting(false);
    if (res.statusCode < 300) {
      showPopupMessage({
        title: 'Password Change Successful!',
        message: '',
        onOkay: () => {
          // The password is no longer stored on the device.
          SecureStorage.deletePassword();
          popPopup();
          bloc.add(new GoToAccountSettingsScreen());
        },
      });
    } else {
      reportError(
        new AccountInformationSetFailedException('Error Code 38bcd:'),
      );
      showGenericErrorPopup();
    }
  };

  const eye = (obscure: boolean, toggle: () => void) => (
    <IconButton
      onPressed={toggle}
      icon={obscure ? FontAwesomeIcons.eyeSlash : FontAwesomeIcons.eye}
      color={MaterialColors.white70}
      size={18}
    />
  );
  const lock = { icon: Icons.lock_outline, color: kCartellYellow };

  return (
    <AppScaffold
      actions={
        <IconButton
          icon={FontAwesomeIcons.xmark}
          color={kAppBarActionsIconColor}
          onPressed={isSubmitting ? null : goBack}
        />
      }
      body={
        <PopScope
          canPop={false}
          onPopInvoked={() => {
            // Back waits for the request, as X and ← do.
            if (submitting.current) {
              return;
            }
            goBack();
          }}
        >
          <SafeArea style={styles.expanded}>
            <ModalProgressHUD
              inAsyncCall={isSubmitting}
              style={styles.expanded}
            >
              <ScrollView>
                <View style={styles.backPadding}>
                  <IconButton
                    icon={FontAwesomeIcons.arrowLeftLong}
                    color={ColorScheme.onSurfaceVariant}
                    onPressed={isSubmitting ? null : goBack}
                  />
                </View>
                <View style={styles.horizontal20}>
                  <View style={styles.headerRow}>
                    <View style={styles.avatarPadding}>
                      <CircleAvatar radius={25} />
                    </View>
                    <View style={styles.flexible}>
                      <Text style={titleStyle}>Account Settings</Text>
                    </View>
                  </View>
                  <View style={styles.form}>
                    <Text style={headingStyle}>Edit Your Password.</Text>
                    <View style={styles.gap16} />
                    <OutlinedTextField
                      value={oldPwd}
                      onChangeText={setOldPwd}
                      secureTextEntry={obscureTextOld}
                      testID="currentPassword"
                      labelText="Current Password"
                      prefixIcon={lock}
                      hintText="Enter your current password"
                      suffix={eye(obscureTextOld, () =>
                        setObscureTextOld(o => !o),
                      )}
                    />
                    <View style={styles.gap16} />
                    <OutlinedTextField
                      value={newPwd}
                      onChangeText={value => {
                        setNewPwd(value);
                        const result = validatePassword(value);
                        if (result === '') {
                          setShowConfirmPassword(true);
                          setShowPwdError(false);
                          setPwdError('');
                          return;
                        }
                        setShowPwdError(true);
                        setConfirmPwd('');
                        setShowConfirmPassword(false);
                        setPwdError(result);
                      }}
                      secureTextEntry={obscureTextNew}
                      testID="newPassword"
                      labelText="New Password"
                      prefixIcon={lock}
                      hintText="Enter your new password"
                      suffix={eye(obscureTextNew, () =>
                        setObscureTextNew(o => !o),
                      )}
                      errorText={showPwdError ? pwdError : null}
                      errorColor={MaterialColors.red}
                      errorBorderColor={
                        showPwdError ? MaterialColors.red : undefined
                      }
                    />
                    {showConfirmPassword && (
                      <>
                        <View style={styles.gap16} />
                        <OutlinedTextField
                          value={confirmPwd}
                          onChangeText={setConfirmPwd}
                          secureTextEntry={obscureTextConf}
                          testID="confirmPassword"
                          labelText="Confirm New Password"
                          prefixIcon={lock}
                          hintText="Re-enter your new password"
                          suffix={eye(obscureTextConf, () =>
                            setObscureTextConf(o => !o),
                          )}
                        />
                      </>
                    )}
                    <View style={styles.gap16} />
                    <RoundedButton
                      stretch
                      onPressed={
                        isSubmitting
                          ? null
                          : () => {
                              submit();
                            }
                      }
                      title="Submit"
                      buttonColor={kCartellBlue}
                      buttonTitleColor={kCartellBlack}
                      icon={FontAwesomeIcons.circleCheck}
                      iconColor={kCartellBlack}
                    />
                  </View>
                </View>
              </ScrollView>
            </ModalProgressHUD>
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
  includeFontPadding: false,
};
const headingStyle = {
  ...toRN(merge(ambientTextStyle, { fontSize: 20, fontWeight: 'bold' })),
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  expanded: { flex: 1, alignSelf: 'stretch' },
  backPadding: { alignItems: 'flex-start', paddingLeft: 10, paddingTop: 25 },
  horizontal20: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 25,
  },
  avatarPadding: { paddingLeft: 15, paddingRight: 15, paddingBottom: 20 },
  flexible: { flexShrink: 1 },
  form: { padding: 10 },
  gap16: { height: 16 },
});
