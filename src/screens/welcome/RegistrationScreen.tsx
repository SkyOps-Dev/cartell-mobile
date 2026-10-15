// Port of frontend/lib/screens/welcome/registration_screen.dart (spec 08 §6).
//
// Scaffold with the back FAB at startTop (disabled while submitting) → ModalProgressHUD over the
// whole body → SafeArea → Center → scroll (padding 24) → max width 500 → Column(stretch):
//   logo h60, 24, "Create Account" (28 bold), Padding(8)[subtitle 16], 60,
//   Row[First Name (person_outline) | 16 | Last Name], 16, Email (validated per keystroke), 16,
//   Password (validated per keystroke; invalid → confirm cleared and hidden), [16, Confirm],
//   16, Phone Number, 32, Register (blue), 12, Wrap(centre)["Already have an account?",
//   Login Here (amber)].
// Validation messages are red #FF5252 with a #FF5252 1 px border; Register is never disabled by
// them. Fields are pre-filled once, on mount, from the state.
// The column is one AutofillGroup that cancels when the screen goes away; the only commit is
// AttemptRegistrationEvent's, on 201 (PARITY_ISSUES P5).

import React, { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { AuthBackButton } from '../../components/buttons/AuthBackButton';
import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { TextButton } from '../../components/buttons/TextButton';
import { AutofillGroup } from '../../components/forms/AutofillGroup';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { RevealingScrollView } from '../../components/layout/RevealingScrollView';
import { Scaffold } from '../../components/layout/Scaffold';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import { ModalProgressHUD } from '../../components/progress/ModalProgressHUD';
import {
  AttemptRegistrationEvent,
  GoToLoginScreenEvent,
  GoToWelcomeScreenEvent,
} from '../../state/auth/authBloc';
import { useAuthBloc } from '../../state/auth/AuthBlocContext';
import {
  kCartellAlertRed,
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';
import { SafeArea } from '../../components/layout/SafeArea';

const logo = require('../../../assets/images/cartelldigitalreverse.png');

export function validatePassword(password: string): string {
  let error = '';
  if (password.length === 0) {
    error += 'Password field cannot be empty\n';
    return error;
  }
  if (!/[A-Z]/.test(password)) {
    error += 'Password must contain at least one uppercase letter\n';
  }
  if (!/[0-9]/.test(password)) {
    error += 'Password must contain at least one number\n';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    error += 'Password must contain at least one special character\n';
  }
  if (password.length < 8) {
    error += 'Password must be at least 8 characters long\n';
  }
  return error;
}

/** Quick check only; the server does the real validation. */
export function validateEmail(email: string): string {
  let error = '';
  if (!email.includes('@') || !email.includes('.') || !(email.length >= 5)) {
    error += 'Please enter a valid email';
  }
  return error;
}

// TextInputType.name: iOS name-phone pad; Android has no React Native equivalent of the
// person-name variation (PARITY_ISSUES P6).
const nameKeyboard = Platform.OS === 'ios' ? 'name-phone-pad' : 'default';

type Props = {
  temporaryEmail: string | null;
  temporaryFirstName: string | null;
  temporaryLastName: string | null;
  temporaryPhone: string | null;
  isSubmitting: boolean;
};

export function RegistrationScreen({
  temporaryEmail,
  temporaryFirstName,
  temporaryLastName,
  temporaryPhone,
  isSubmitting,
}: Props) {
  const bloc = useAuthBloc();
  const [obscureText, setObscureText] = useState(true);
  const [obscureTextConf, setObscureTextConf] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [email, setEmail] = useState(temporaryEmail ?? '');
  const [fname, setFname] = useState(temporaryFirstName ?? '');
  const [lname, setLname] = useState(temporaryLastName ?? '');
  const [pwd, setPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [phone, setPhone] = useState(temporaryPhone ?? '');

  const eye = (obscure: boolean, toggle: () => void) => (
    <IconButton
      onPressed={toggle}
      tooltip={obscure ? 'Show password' : 'Hide password'}
      icon={obscure ? FontAwesomeIcons.eyeSlash : FontAwesomeIcons.eye}
      color={MaterialColors.white70}
      size={18}
    />
  );

  return (
    <Scaffold
      floatingActionButtonLocation="startTop"
      floatingActionButton={
        <AuthBackButton
          onPressed={
            isSubmitting ? null : () => bloc.add(new GoToWelcomeScreenEvent())
          }
        />
      }
    >
      <ModalProgressHUD inAsyncCall={isSubmitting} style={styles.fill}>
        <SafeArea style={styles.fill}>
          <RevealingScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              <AutofillGroup>
                <Image
                  source={logo}
                  // The PNG is 2081 × 977; decode it at the size shown (Flutter decodes it once and
                  // caches it, so its screen switches never pay for it).
                  resizeMethod="resize"
                  resizeMode="contain"
                  style={styles.logo}
                />
                <View style={styles.gap24} />
                <Text style={titleStyle}>Create Account</Text>
                <View style={styles.padding8}>
                  <Text style={subtitleStyle}>
                    Create a new account to get started with your Cartell alert
                    system!
                  </Text>
                </View>
                <View style={styles.gap60} />
                <View style={styles.row}>
                  <View style={styles.expanded}>
                    <OutlinedTextField
                      value={fname}
                      onChangeText={setFname}
                      autoComplete="name-given"
                      testID="firstName"
                      textContentType="givenName"
                      importantForAutofill="yes"
                      autoCapitalize="none"
                      keyboardType={nameKeyboard}
                      labelText="First Name"
                      prefixIcon={{
                        icon: Icons.person_outline,
                        color: kCartellYellow,
                      }}
                      hintText="First Name"
                    />
                  </View>
                  <View style={styles.gap16w} />
                  <View style={styles.expanded}>
                    <OutlinedTextField
                      value={lname}
                      onChangeText={setLname}
                      autoComplete="name-family"
                      testID="lastName"
                      textContentType="familyName"
                      importantForAutofill="yes"
                      autoCapitalize="none"
                      keyboardType={nameKeyboard}
                      labelText="Last Name"
                      hintText="Last Name"
                    />
                  </View>
                </View>
                <View style={styles.gap16} />
                <OutlinedTextField
                  value={email}
                  onChangeText={value => {
                    setEmail(value);
                    const result = validateEmail(value);
                    setEmailError(result === '' ? null : result);
                  }}
                  autoComplete="username"
                  testID="email"
                  textContentType="username"
                  importantForAutofill="yes"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  labelText="Email"
                  prefixIcon={{
                    icon: Icons.email_outlined,
                    color: kCartellYellow,
                  }}
                  errorText={emailError}
                  errorColor={kCartellAlertRed}
                  errorBorderColor={kCartellAlertRed}
                  hintText="Enter your email"
                />
                <View style={styles.gap16} />
                <OutlinedTextField
                  value={pwd}
                  onChangeText={value => {
                    setPwd(value);
                    const result = validatePassword(value);
                    if (result === '') {
                      setShowConfirmPassword(true);
                      setPwdError(null);
                      return;
                    }
                    setPwdError(result);
                    setConfirmPwd('');
                    setShowConfirmPassword(false);
                  }}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  importantForAutofill="yes"
                  autoCapitalize="none"
                  testID="password"
                  secureTextEntry={obscureText}
                  labelText="Password"
                  prefixIcon={{
                    icon: Icons.lock_outline,
                    color: kCartellYellow,
                  }}
                  hintText="Enter your password"
                  suffix={eye(obscureText, () => setObscureText(o => !o))}
                  errorText={pwdError}
                  errorColor={kCartellAlertRed}
                  errorBorderColor={kCartellAlertRed}
                />
                {showConfirmPassword && <View style={styles.gap16} />}
                {showConfirmPassword && (
                  <OutlinedTextField
                    value={confirmPwd}
                    onChangeText={setConfirmPwd}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    importantForAutofill="yes"
                    autoCapitalize="none"
                    testID="confirmPassword"
                    secureTextEntry={obscureTextConf}
                    labelText="Confirm Password"
                    prefixIcon={{
                      icon: Icons.lock_outline,
                      color: kCartellYellow,
                    }}
                    hintText="Re-enter your password"
                    suffix={eye(obscureTextConf, () =>
                      setObscureTextConf(o => !o),
                    )}
                  />
                )}
                <View style={styles.gap16} />
                <OutlinedTextField
                  value={phone}
                  onChangeText={setPhone}
                  autoComplete="tel"
                  testID="phone"
                  textContentType="telephoneNumber"
                  importantForAutofill="yes"
                  autoCapitalize="none"
                  keyboardType="phone-pad"
                  labelText="Phone Number"
                  prefixIcon={{
                    icon: Icons.phone_outlined,
                    color: kCartellYellow,
                  }}
                  hintText="Enter your phone number"
                />
                <View style={styles.gap32} />
                <RoundedButton
                  stretch
                  onPressed={
                    isSubmitting
                      ? null
                      : () =>
                          bloc.add(
                            new AttemptRegistrationEvent({
                              email,
                              password: pwd,
                              passwordConfirmed: confirmPwd,
                              firstName: fname,
                              lastName: lname,
                              phoneNo: phone,
                            }),
                          )
                  }
                  title="Register"
                  buttonColor={kCartellBlue}
                  buttonTitleColor={kCartellBlack}
                />
                <View style={styles.gap12} />
                <View style={styles.wrapCentre}>
                  <Text style={ambient}>Already have an account?</Text>
                  <TextButton
                    label="Login Here"
                    color={kCartellYellow}
                    onPressed={() => bloc.add(new GoToLoginScreenEvent())}
                  />
                </View>
              </AutofillGroup>
            </View>
          </RevealingScrollView>
        </SafeArea>
      </ModalProgressHUD>
    </Scaffold>
  );
}

const ambient = toRN(ambientTextStyle);
const titleStyle = {
  ...toRN(
    merge(ambientTextStyle, {
      fontSize: 28,
      fontWeight: 'bold',
      color: MaterialColors.white,
    }),
  ),
  textAlign: 'center' as const,
};
const subtitleStyle = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 16, color: MaterialColors.white }),
  ),
  textAlign: 'center' as const,
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  form: { width: '100%', maxWidth: 500, alignItems: 'stretch' },
  logo: { height: 60, width: '100%' },
  padding8: { padding: 8 },
  row: { flexDirection: 'row' },
  expanded: { flex: 1 },
  gap12: { height: 12 },
  gap16: { height: 16 },
  gap16w: { width: 16 },
  gap24: { height: 24 },
  gap32: { height: 32 },
  gap60: { height: 60 },
  wrapCentre: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
