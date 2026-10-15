// Port of frontend/lib/screens/welcome/welcome_screen.dart (spec 08 §2).
//
// Scaffold (no app bar, no SafeArea) → Center → scroll → horizontal padding 10% of the width
// (20% at 800 and wider) → Column(centre, stretch):
//   screenHeight/18, logo (height screenHeight/15, contain), screenHeight/15,
//   Log In (blue, arrowRightToBracket), Register (amber, clipboardList),
//   screenHeight/75 twice, "Open Debug Info" (Material 3 default ElevatedButton, lavender, Q41).
// screenHeight is the window's height in PHYSICAL pixels (Q20), so the gaps differ between
// phones of different pixel density.
//
// The version and build number are read once, when the screen appears (PackageInfo.fromPlatform,
// not awaited). "Open Debug Info" opens the Debug Info panel (src/screens/misc/DebugMenu.tsx)
// with them. Flutter reads them with `_version!` when the panel builds, so a tap before they have
// arrived fails with a null-check error; that window is a few milliseconds after the screen
// appears, too short to tap in. Here such a tap reports the same error and opens nothing.

import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  PixelRatio,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ElevatedButton } from '../../components/buttons/ElevatedButton';
import { RoundedButton } from '../../components/buttons/RoundedButton';
import { FontAwesomeIcons } from '../../components/icons/iconData';
import { showCupertinoModalPopup } from '../../components/popups/CupertinoModalPopup';
import {
  PackageInfo,
  packageInfoFromPlatform,
} from '../../services/packageInfo';
import { reportError } from '../../services/reportError';
import {
  GoToLoginScreenEvent,
  GoToRegistrationScreenEvent,
} from '../../state/auth/authBloc';
import { useAuthBloc } from '../../state/auth/AuthBlocContext';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellYellow,
  kScaffoldBackground,
} from '../../theme/colors';
import { DebugMenu } from '../misc/DebugMenu';

const logo = require('../../../assets/images/cartelldigitalreverse.png');

export function WelcomeScreen() {
  const bloc = useAuthBloc();
  const { width } = useWindowDimensions();
  // platformDispatcher.views.first.physicalSize.height: the whole window, in physical pixels.
  const screenHeight = Dimensions.get('screen').height * PixelRatio.get();

  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  useEffect(() => {
    packageInfoFromPlatform().then(setPackageInfo, reportError);
  }, []);

  const openDebugInfo = () => {
    if (packageInfo === null) {
      reportError(new TypeError('Null check operator used on a null value'));
      return;
    }
    showCupertinoModalPopup(() => (
      <DebugMenu
        screenHeight={screenHeight}
        version={packageInfo.version}
        buildNumber={packageInfo.buildNumber}
      />
    ));
  };

  return (
    <View style={styles.scaffold}>
      <ScrollView contentContainerStyle={styles.center}>
        <View
          style={[
            styles.column,
            { paddingHorizontal: width < 800 ? width * 0.1 : width * 0.2 },
          ]}
        >
          <View style={{ height: screenHeight / 18 }} />
          <View style={{ height: screenHeight / 15 }}>
            <Image
              source={logo}
              // The PNG is 2081 × 977; decode it at the size shown (Flutter decodes it once and
              // caches it, so its screen switches never pay for it).
              resizeMethod="resize"
              resizeMode="contain"
              style={styles.logo}
            />
          </View>
          <View style={{ height: screenHeight / 15 }} />
          <RoundedButton
            stretch
            title="Log In"
            buttonColor={kCartellBlue}
            buttonTitleColor={kCartellBlack}
            icon={FontAwesomeIcons.arrowRightToBracket}
            iconColor={kCartellBlack}
            onPressed={() => bloc.add(new GoToLoginScreenEvent())}
          />
          <RoundedButton
            stretch
            title="Register"
            buttonTitleColor={kCartellBlack}
            buttonColor={kCartellYellow}
            icon={FontAwesomeIcons.clipboardList}
            iconColor={kCartellBlack}
            onPressed={() => bloc.add(new GoToRegistrationScreenEvent())}
          />
          <View style={{ height: screenHeight / 75 }} />
          <View style={{ height: screenHeight / 75 }} />
          <ElevatedButton label="Open Debug Info" onPressed={openDebugInfo} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scaffold: { flex: 1, backgroundColor: kScaffoldBackground },
  center: { flexGrow: 1, justifyContent: 'center' },
  column: { alignItems: 'stretch' },
  logo: { width: '100%', height: '100%' },
});
