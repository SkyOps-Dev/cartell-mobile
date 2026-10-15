// Port of frontend/lib/screens/welcome/login_screen.dart (spec 08 §5).
//
// Scaffold with the back FAB at startTop (disabled while submitting) → SafeArea → Center →
// ModalProgressHUD(isSubmitting) → scroll → horizontal padding 10% (20% at 800+) → Column(stretch):
//   [only while the keyboard is hidden: 90, logo h155, 65]
//   Email (email keyboard, autofill username, "next" → password; "Enter your email";
//     "Email field cannot be empty" until the user types)
//   24, Password (obscured, eye toggle, autofill password, "done" → submit; "Enter your password";
//     "Password field cannot be empty")
//   Row(end)[Forgot Password (amber) → in-app browser at <server>/password_reset]
//   24, Log In (blue, arrowRightToBracket; grey while submitting)
//   20, Wrap["Don't have an account?", Create One Here (amber) → Registration]
// The email is pre-filled once, on mount, from temporaryEmail.
//
// Q47 (to verify): the HUD sits inside Center, so while submitting it grows to the full body and
// the form moves to the top.
// The column is one AutofillGroup that cancels when the screen goes away; the only commit is
// AttemptLoggingInEvent's, on success (PARITY_ISSUES P5).

import React, { useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AuthBackButton } from '../../components/buttons/AuthBackButton';
import { IconButton } from '../../components/buttons/IconButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { TextButton } from '../../components/buttons/TextButton';
import { AutofillGroup } from '../../components/forms/AutofillGroup';
import { OutlinedTextField } from '../../components/forms/OutlinedTextField';
import { RevealingScrollView } from '../../components/layout/RevealingScrollView';
import { Scaffold, WhenKeyboardHidden } from '../../components/layout/Scaffold';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { ModalProgressHUD } from '../../components/progress/ModalProgressHUD';
import { baseUrlHttp } from '../../config/environment';
import { launchUrl } from '../../services/launchUrl';
import {
  AttemptLoggingInEvent,
  GoToRegistrationScreenEvent,
  GoToWelcomeScreenEvent,
} from '../../state/auth/authBloc';
import { useAuthBloc } from '../../state/auth/AuthBlocContext';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, toRN } from '../../theme/typography';
import { SafeArea } from '../../components/layout/SafeArea';

const logo = require('../../../assets/images/cartelldigitalreverse.png');

type Props = {
  temporaryEmail: string | null;
  emailError: boolean;
  passwordError: boolean;
  isSubmitting: boolean;
};

export function LoginScreen({
  temporaryEmail,
  emailError,
  passwordError,
  isSubmitting,
}: Props) {
  const bloc = useAuthBloc();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState(temporaryEmail ?? '');
  const [password, setPassword] = useState('');
  const [obscureText, setObscureText] = useState(true);
  // The bloc recomputes the empty-field flags only on submit; these hide the message once the
  // user edits that field, and are re-armed on the next submit.
  const [emailErrorDismissed, setEmailErrorDismissed] = useState(false);
  const [passwordErrorDismissed, setPasswordErrorDismissed] = useState(false);
  const passwordFocus = useRef<React.ComponentRef<typeof TextInput>>(null);

  const showEmailError = emailError && !emailErrorDismissed;
  const showPasswordError = passwordError && !passwordErrorDismissed;

  const submit = () => {
    if (isSubmitting) {
      return;
    }
    setEmailErrorDismissed(false);
    setPasswordErrorDismissed(false);
    bloc.add(new AttemptLoggingInEvent(email, password));
  };

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
      <SafeArea style={styles.center}>
        <ModalProgressHUD
          inAsyncCall={isSubmitting}
          style={isSubmitting ? styles.hudExpanded : styles.hudShrink}
        >
          <RevealingScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.column,
                { paddingHorizontal: width < 800 ? width * 0.1 : width * 0.2 },
              ]}
            >
              <AutofillGroup>
                {/* Flutter: `if (MediaQuery.of(context).viewInsets.bottom <= 0)`. */}
                <WhenKeyboardHidden>
                  <View style={styles.logoBlock}>
                    <View style={styles.gap90} />
                    <Image
                      source={logo}
                      // The PNG is 2081 × 977; decode it at the size shown (Flutter decodes it once and
                      // caches it, so its screen switches never pay for it).
                      resizeMethod="resize"
                      resizeMode="contain"
                      style={styles.logo}
                    />
                    <View style={styles.gap65} />
                  </View>
                </WhenKeyboardHidden>
                <OutlinedTextField
                  value={email}
                  onChangeText={text => {
                    setEmail(text);
                    if (showEmailError) {
                      setEmailErrorDismissed(true);
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="username"
                  textContentType="username"
                  importantForAutofill="yes"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordFocus.current?.focus()}
                  hintText="Enter your email"
                  errorText={
                    showEmailError ? 'Email field cannot be empty' : null
                  }
                />
                <View style={styles.gap24} />
                <OutlinedTextField
                  ref={passwordFocus}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (showPasswordError) {
                      setPasswordErrorDismissed(true);
                    }
                  }}
                  secureTextEntry={obscureText}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  hintText="Enter your password"
                  errorText={
                    showPasswordError ? 'Password field cannot be empty' : null
                  }
                  suffix={
                    <View style={styles.suffixPadding}>
                      <IconButton
                        onPressed={() => setObscureText(o => !o)}
                        tooltip={
                          obscureText ? 'Show password' : 'Hide password'
                        }
                        icon={
                          obscureText
                            ? FontAwesomeIcons.eyeSlash
                            : FontAwesomeIcons.eye
                        }
                        color={MaterialColors.white70}
                        size={18}
                      />
                    </View>
                  }
                />
                <View style={styles.rowEnd}>
                  <TextButton
                    label="Forgot Password"
                    color={kCartellYellow}
                    onPressed={() => {
                      launchUrl(`${baseUrlHttp()}/password_reset`);
                    }}
                  />
                </View>
                <View style={styles.gap24} />
                <RoundedButton
                  stretch
                  buttonTitleColor={kCartellBlack}
                  title="Log In"
                  buttonColor={kCartellBlue}
                  icon={FontAwesomeIcons.arrowRightToBracket}
                  iconColor={kCartellBlack}
                  onPressed={isSubmitting ? null : submit}
                />
                <View style={styles.gap20} />
                <View style={styles.wrap}>
                  <Text style={ambient}>Don't have an account?</Text>
                  <TextButton
                    label="Create One Here"
                    color={kCartellYellow}
                    onPressed={() =>
                      bloc.add(new GoToRegistrationScreenEvent())
                    }
                  />
                </View>
              </AutofillGroup>
            </View>
          </RevealingScrollView>
        </ModalProgressHUD>
      </SafeArea>
    </Scaffold>
  );
}

const ambient = toRN(ambientTextStyle);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  hudShrink: { flexShrink: 1 },
  hudExpanded: { flex: 1 },
  scroll: { flexGrow: 0 },
  column: { alignItems: 'stretch' },
  logoBlock: { alignItems: 'center' },
  logo: { height: 155, width: '100%' },
  gap90: { height: 90 },
  gap65: { height: 65 },
  gap24: { height: 24 },
  gap20: { height: 20 },
  suffixPadding: { paddingHorizontal: 5 },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
