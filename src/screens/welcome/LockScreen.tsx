// Port of frontend/lib/screens/welcome/lock_screen.dart: shown when a valid session is waiting
// behind the biometric gate.
//
// Scaffold → SafeArea → Center → SingleChildScrollView → Padding(h40) → Column(centre, stretch):
//   SizedBox(h155, logo), 40, Icon(fingerprint, 48, Gravel), 20, Text('Cartell is locked', 20,
//   white), [10, Text(message, Gravel)], 40, RoundedButton('Unlock', fingerprint, blue), 10,
//   TextButton('Use password instead', amber).
// Two ways forward, always both present. Unlock runs the auto sign-in again, so the prompt
// reappears; the password is the one that cannot fail because of hardware, a removed enrolment or
// a lockout. A screen with only the first would strand people.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '../../components/buttons/RoundedButton';
import { TextButton } from '../../components/buttons/TextButton';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { CenteredSingleChildScrollView } from '../../components/layout/CenteredSingleChildScrollView';
import { SafeArea } from '../../components/layout/SafeArea';
import { Scaffold } from '../../components/layout/Scaffold';
import {
  AutoLoginEvent,
  GoToLoginScreenEvent,
} from '../../state/auth/authBloc';
import { useAuthBloc } from '../../state/auth/AuthBlocContext';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellLightGray,
  kCartellYellow,
  MaterialColors,
} from '../../theme/colors';
import { ambientTextStyle, merge, toRN } from '../../theme/typography';

const logo = require('../../../assets/images/cartelldigitalreverse.png');

export function LockScreen({ message }: { message: string | null }) {
  const bloc = useAuthBloc();
  return (
    <Scaffold>
      <SafeArea style={styles.fill}>
        <CenteredSingleChildScrollView>
          <View style={styles.column}>
            <View style={styles.logoBox}>
              {/* Image's default fit, scaleDown: the 2081 × 977 logo shrinks to fit the box. */}
              <Image
                source={logo}
                resizeMethod="resize"
                resizeMode="contain"
                style={styles.logo}
              />
            </View>
            <View style={styles.gap40} />
            <View style={styles.iconRow}>
              <Icon
                icon={FontAwesomeIcons.fingerprint}
                size={48}
                color={kCartellLightGray}
              />
            </View>
            <View style={styles.gap20} />
            <Text style={titleStyle}>Cartell is locked</Text>
            {message !== null && (
              <>
                <View style={styles.gap10} />
                <Text style={messageStyle}>{message}</Text>
              </>
            )}
            <View style={styles.gap40} />
            <RoundedButton
              stretch
              title="Unlock"
              icon={FontAwesomeIcons.fingerprint}
              buttonColor={kCartellBlue}
              buttonTitleColor={kCartellBlack}
              iconColor={kCartellBlack}
              onPressed={() => bloc.add(new AutoLoginEvent())}
            />
            <View style={styles.gap10} />
            <TextButton
              label="Use password instead"
              color={kCartellYellow}
              onPressed={() => bloc.add(new GoToLoginScreenEvent())}
            />
          </View>
        </CenteredSingleChildScrollView>
      </SafeArea>
    </Scaffold>
  );
}

// Text styles merge over the Scaffold's ambient bodyMedium.
const titleStyle = {
  ...toRN(
    merge(ambientTextStyle, { fontSize: 20, color: MaterialColors.white }),
  ),
  textAlign: 'center' as const,
};
const messageStyle = {
  ...toRN(merge(ambientTextStyle, { color: kCartellLightGray })),
  textAlign: 'center' as const,
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { paddingHorizontal: 40, alignItems: 'stretch' },
  logoBox: { height: 155 },
  logo: { width: '100%', height: '100%' },
  iconRow: { alignItems: 'center' },
  gap10: { height: 10 },
  gap20: { height: 20 },
  gap40: { height: 40 },
});
