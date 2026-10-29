// Port of frontend/lib/screens/misc/debug_menu.dart: the Debug Info panel the Welcome screen
// opens with showCupertinoModalPopup, and its Switch Environment view.
//
// Both views: CupertinoPopupSurface → DefaultTextStyle(TextStyle()) → Container(Cartell Dark Gray,
// height screenHeight × 0.30, as wide as allowed) → Center → Padding(8) → Column(min).
// screenHeight is the window height in PHYSICAL pixels (Q20), so on a 3× phone the panel covers
// about 90% of the screen, not 30%. Content taller than the panel overflows it, centred, and the
// surface clips it.
//
// DefaultTextStyle(TextStyle()) replaces the ambient style with an empty one, so the panel's own
// texts are drawn in the engine defaults: white, the system font, natural line height (in RN:
// no lineHeight and no Android font padding).
// RoundedButton labels keep their Material style.
//
// Which buttons show is decided by the build: Verify Sentry Setup and Reset Show Feedback in
// debug builds (kDebugMode), Change Environment when the build started on a server other than
// LIVE (isTestBuild, fixed at startup, Q9).

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { RoundedButton } from '../../components/buttons/RoundedButton';
import { Icon } from '../../components/icons/Icon';
import { FontAwesomeIcons, Icons } from '../../components/icons/iconData';
import {
  CupertinoPopupSurface,
  popModalPopup,
} from '../../components/popups/CupertinoModalPopup';
import { showPopupMessage } from '../../components/popups/popups';
import {
  config,
  getEnvironmentName,
  isTestBuild,
  setEnvironmentName,
} from '../../config/environment';
import { reportError } from '../../services/reportError';
import { SecureStorage } from '../../services/secureStorage';
import {
  kCartellBlack,
  kCartellBlue,
  kCartellDarkGray,
  kCartellLightGray,
  kCartellYellow,
  withOpacity,
} from '../../theme/colors';
import { TestConnectionWidget } from '../welcome/TestConnection';

type Props = {
  screenHeight: number;
  version: string;
  buildNumber: string;
};

export function DebugMenu({ screenHeight, version, buildNumber }: Props) {
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const toggleLayout = () => setIsEditingBaseUrl(editing => !editing);
  const { width } = useWindowDimensions();

  return (
    <CupertinoPopupSurface>
      <View
        style={[styles.panel, { width, height: screenHeight * 0.3 }]}
        testID="debug-menu"
      >
        <View style={styles.padding}>
          {isEditingBaseUrl ? (
            <ModifyBaseUrl onDone={toggleLayout} />
          ) : (
            <Init
              version={version}
              buildNumber={buildNumber}
              onChangeEnvironment={toggleLayout}
            />
          )}
        </View>
      </View>
    </CupertinoPopupSurface>
  );
}

function Init({
  version,
  buildNumber,
  onChangeEnvironment,
}: {
  version: string;
  buildNumber: string;
  onChangeEnvironment: () => void;
}) {
  return (
    <>
      <View style={styles.infoLines}>
        <Text style={styles.infoLine}>{`Version: ${version}`}</Text>
        <Text style={styles.infoLine}>{`Build Number: ${buildNumber}`}</Text>
        {/* Shown on every build, LIVE included. */}
        <Text style={styles.infoLine}>
          {`Environment Name: ${getEnvironmentName()}`}
        </Text>
      </View>
      <View style={styles.infoGap} />
      <RoundedButton
        stretch
        title="Test Connection"
        buttonTitleColor={kCartellBlack}
        buttonColor={kCartellYellow}
        icon={FontAwesomeIcons.circleQuestion}
        iconColor={kCartellBlack}
        onPressed={() => {
          showPopupMessage({
            title: '',
            message: '',
            body: <TestConnectionWidget />,
          });
        }}
      />
      {__DEV__ && (
        <RoundedButton
          stretch
          title="Verify Sentry Setup"
          buttonTitleColor={kCartellBlack}
          buttonColor={kCartellYellow}
          iconColor={kCartellBlack}
          // Flutter throws here and the error reaches Sentry with nothing on screen. A throw in
          // React Native shows a full-screen error in debug builds, so the error is reported
          // directly instead.
          onPressed={() => reportError(new Error('This is a test exception'))}
        />
      )}
      {__DEV__ && (
        <RoundedButton
          stretch
          onPressed={() => {
            SecureStorage.setShowFeedback(true);
          }}
          buttonColor={kCartellYellow}
          title="Reset Show Feedback"
          buttonTitleColor={kCartellBlack}
        />
      )}
      {isTestBuild && (
        <RoundedButton
          stretch
          buttonColor={kCartellYellow}
          buttonTitleColor={kCartellBlack}
          title="Change Environment"
          onPressed={onChangeEnvironment}
        />
      )}
      <RoundedButton
        stretch
        title="Close"
        buttonTitleColor={kCartellBlack}
        buttonColor={kCartellBlue}
        onPressed={popModalPopup}
      />
    </>
  );
}

function saveModifications(
  newBaseDomain: string,
  newEnvironmentName: string,
  newShouldUseTLS: boolean,
) {
  config.baseDomain = newBaseDomain;
  setEnvironmentName(newEnvironmentName);
  config.shouldUseTLS = newShouldUseTLS;
  // PORT-GAP: SecureStorage.deleteFCMToken(). It runs after the switch, so it deletes the
  // push token stored for the environment just switched to.
}

function ModifyBaseUrl({ onDone }: { onDone: () => void }) {
  const option = (
    label: string,
    domain: string,
    envName: string,
    useTLS: boolean,
  ) => (
    <EnvOption
      label={label}
      domain={domain}
      isActive={
        config.baseDomain === domain && getEnvironmentName() === envName
      }
      onTap={() => {
        saveModifications(domain, envName, useTLS);
        onDone();
      }}
    />
  );
  return (
    <>
      <Text style={styles.switchTitle}>Switch Environment</Text>
      <View style={styles.gap12} />
      <View style={styles.warning}>
        <Icon
          icon={FontAwesomeIcons.triangleExclamation}
          color={kCartellYellow}
          size={16}
        />
        <View style={styles.gap8} />
        <Text style={styles.warningText}>
          Warning: When using Beta or Production environments, pairing new hubs
          to the server will not work.
        </Text>
      </View>
      <View style={styles.gap16} />
      {option('Beta', 'beta.cartellap.com', 'BETA', true)}
      {option('Test', 'test.cartellap.com', 'TEST', true)}
      {option('Production', 'cartellap.com', 'LIVE', true)}
      <View style={styles.gap12} />
      <RoundedButton
        stretch
        title="Back"
        buttonTitleColor={kCartellBlack}
        buttonColor={kCartellBlue}
        onPressed={onDone}
      />
    </>
  );
}

/** _buildEnvOption: a GestureDetector, so a tap shows no ripple. */
function EnvOption({
  label,
  domain,
  isActive,
  onTap,
}: {
  label: string;
  domain: string;
  isActive: boolean;
  onTap: () => void;
}) {
  return (
    <Pressable
      onPress={onTap}
      // A GestureDetector plays no click (only Material ink calls Feedback.forTap).
      android_disableSound
      accessibilityRole="radio"
      accessibilityState={{ checked: isActive }}
      style={[styles.option, isActive ? styles.optionActive : null]}
    >
      <Icon
        icon={isActive ? Icons.radio_button_checked : Icons.radio_button_off}
        color={isActive ? kCartellBlue : kCartellLightGray}
        size={22}
      />
      <View style={styles.gap12h} />
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <View style={styles.gap2} />
        <Text style={styles.optionDomain}>{domain}</Text>
      </View>
      {isActive && (
        <Icon icon={Icons.check_circle} color={kCartellBlue} size={22} />
      )}
    </Pressable>
  );
}

const white = '#FFFFFF';

const styles = StyleSheet.create({
  panel: {
    backgroundColor: kCartellDarkGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padding: { alignSelf: 'stretch', padding: 8 },
  infoLines: { maxHeight: 200, alignItems: 'center' },
  infoLine: { fontSize: 20, lineHeight: 25, color: white, textAlign: 'center' },
  infoGap: { height: 30 },
  switchTitle: {
    includeFontPadding: false,
    fontSize: 20,
    fontWeight: 'bold',
    color: white,
    textAlign: 'center',
  },
  warning: {
    marginHorizontal: 16,
    padding: 10,
    backgroundColor: withOpacity(kCartellYellow, 0.1),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: withOpacity(kCartellYellow, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    includeFontPadding: false,
    flex: 1,
    fontSize: 12,
    color: kCartellYellow,
    fontWeight: '500',
  },
  option: {
    marginVertical: 4,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: kCartellBlack,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(kCartellLightGray, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: withOpacity(kCartellBlue, 0.15),
    borderWidth: 2,
    borderColor: kCartellBlue,
  },
  optionText: { flex: 1 },
  optionLabel: {
    includeFontPadding: false,
    fontSize: 16,
    fontWeight: '600',
    color: white,
  },
  optionDomain: {
    includeFontPadding: false,
    fontSize: 12,
    color: kCartellLightGray,
  },
  gap2: { height: 2 },
  gap8: { width: 8 },
  gap12: { height: 12 },
  gap12h: { width: 12 },
  gap16: { height: 16 },
});
