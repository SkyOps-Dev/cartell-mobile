// Port of Flutter's local_auth 2.3.0 as the app uses it: LocalAuthentication (isDeviceSupported,
// getAvailableBiometrics, authenticate) over the Dart halves of local_auth_android 1.0.56 and
// local_auth_darwin 1.6.1, which turn the native result into true / false or a thrown error with
// the plugin's code. The native halves are the CartellLocalAuth module:
// android/.../LocalAuthModule.kt + AuthenticationHelper.kt, ios/Cartell/LocalAuthModule.m.
//
// The prompt's texts are local_auth's English defaults (AndroidAuthMessages, IOSAuthMessages):
// the app passes none of its own.

import { NativeModules, Platform } from 'react-native';

/** AuthenticationOptions, with local_auth's defaults. */
export type AuthenticationOptions = {
  useErrorDialogs?: boolean;
  stickyAuth?: boolean;
  sensitiveTransaction?: boolean;
  biometricOnly?: boolean;
};

/** PlatformException: what the plugin throws, with the same codes (local_auth error_codes.dart). */
export class LocalAuthError extends Error {
  constructor(
    readonly code: string,
    message?: string,
    readonly details?: string,
  ) {
    super(message ?? code);
    this.name = 'PlatformException';
  }
}

/** local_auth/error_codes.dart */
export const AuthErrorCodes = {
  passcodeNotSet: 'PasscodeNotSet',
  notEnrolled: 'NotEnrolled',
  notAvailable: 'NotAvailable',
  otherOperatingSystem: 'OtherOperatingSystem',
  lockedOut: 'LockedOut',
  permanentlyLockedOut: 'PermanentlyLockedOut',
  biometricOnlyNotSupported: 'biometricOnlyNotSupported',
} as const;

// AndroidAuthMessages' defaults (auth_messages_android.dart).
const androidStrings = {
  biometricHint: 'Verify identity',
  biometricNotRecognized: 'Not recognized. Try again.',
  biometricRequiredTitle: 'Biometric required',
  cancelButton: 'Cancel',
  deviceCredentialsRequiredTitle: 'Device credentials required',
  deviceCredentialsSetupDescription: 'Device credentials required',
  goToSettingsButton: 'Go to settings',
  goToSettingsDescription:
    "Biometric authentication is not set up on your device. Go to 'Settings > Security' to add biometric authentication.",
  signInTitle: 'Authentication required',
};

// IOSAuthMessages' defaults (auth_messages_ios.dart); no localizedFallbackTitle, so iOS uses its own.
const iosStrings = {
  lockOut:
    'Biometric authentication is disabled. Please lock and unlock your screen to enable it.',
  goToSettingsButton: 'Go to settings',
  goToSettingsDescription:
    'Biometric authentication is not set up on your device. Please either enable Touch ID or Face ID on your phone.',
  cancelButton: 'OK',
};

type IosResult = {
  result: string;
  errorMessage?: string;
  errorDetails?: string;
};

type LocalAuthNative = {
  isDeviceSupported(): Promise<boolean>;
  getEnrolledBiometrics(): Promise<string[]>;
  authenticate(
    options: Record<string, boolean>,
    strings: Record<string, string>,
  ): Promise<string | IosResult>;
};

/** MissingPluginException: the native half is not in the build. Not a PlatformException. */
export class MissingPluginError extends Error {
  constructor() {
    super('CartellLocalAuth is not linked');
    this.name = 'MissingPluginException';
  }
}

function native(): LocalAuthNative {
  const module = NativeModules.CartellLocalAuth as LocalAuthNative | undefined;
  if (!module) {
    throw new MissingPluginError();
  }
  return module;
}

/** LocalAuthAndroid.authenticate's switch over AuthResult. */
function androidOutcome(result: string): boolean {
  switch (result) {
    case 'success':
      return true;
    case 'failure':
      return false;
    case 'errorAlreadyInProgress':
      throw new LocalAuthError(
        'auth_in_progress',
        'Authentication in progress',
      );
    case 'errorNoActivity':
      throw new LocalAuthError(
        'no_activity',
        'local_auth plugin requires a foreground activity',
      );
    case 'errorNotFragmentActivity':
      throw new LocalAuthError(
        'no_fragment_activity',
        'local_auth plugin requires activity to be a FragmentActivity.',
      );
    case 'errorNotAvailable':
      throw new LocalAuthError(
        'NotAvailable',
        'Security credentials not available.',
      );
    case 'errorNotEnrolled':
      throw new LocalAuthError(
        'NotEnrolled',
        'No Biometrics enrolled on this device.',
      );
    case 'errorLockedOutTemporarily':
      throw new LocalAuthError(
        'LockedOut',
        'The operation was canceled because the API is locked out due to too many attempts. This occurs after 5 failed attempts, and lasts for 30 seconds.',
      );
    case 'errorLockedOutPermanently':
      throw new LocalAuthError(
        'PermanentlyLockedOut',
        'The operation was canceled because ERROR_LOCKOUT occurred too many times. Biometric authentication is disabled until the user unlocks with strong authentication (PIN/Pattern/Password)',
      );
    default:
      throw new LocalAuthError('unknown', `Unknown result: ${result}`);
  }
}

// LocalAuthDarwin.authenticate's switch over AuthResult.
const iosErrorCodes: Record<string, string> = {
  errorNotAvailable: 'NotAvailable',
  errorNotEnrolled: 'NotEnrolled',
  errorPasscodeNotSet: 'PasscodeNotSet',
  errorUserCancelled: 'UserCancelled',
  errorBiometricNotAvailable: 'BiometricNotAvailable',
  errorUserFallback: 'UserFallback',
};

function iosOutcome({
  result,
  errorMessage,
  errorDetails,
}: IosResult): boolean {
  if (result === 'success') {
    return true;
  }
  if (result === 'failure') {
    return false;
  }
  throw new LocalAuthError(
    iosErrorCodes[result] ?? 'unknown',
    errorMessage,
    errorDetails,
  );
}

export const LocalAuthentication = {
  /** Whether the device can authenticate at all: a screen lock, or an enrolled biometric. */
  isDeviceSupported: (): Promise<boolean> => native().isDeviceSupported(),

  /** The enrolled biometrics: 'weak' / 'strong' on Android, 'face' / 'fingerprint' on iOS. */
  getAvailableBiometrics: (): Promise<string[]> =>
    native().getEnrolledBiometrics(),

  async authenticate({
    localizedReason,
    options = {},
  }: {
    localizedReason: string;
    options?: AuthenticationOptions;
  }): Promise<boolean> {
    const {
      useErrorDialogs = true,
      stickyAuth = false,
      sensitiveTransaction = true,
      biometricOnly = false,
    } = options;
    if (Platform.OS === 'ios') {
      const result = await native().authenticate(
        { biometricOnly, sticky: stickyAuth, useErrorDialogs },
        { reason: localizedReason, ...iosStrings },
      );
      return iosOutcome(result as IosResult);
    }
    const result = await native().authenticate(
      {
        biometricOnly,
        sensitiveTransaction,
        sticky: stickyAuth,
        useErrorDialogs,
      },
      { reason: localizedReason, ...androidStrings },
    );
    return androidOutcome(result as string);
  },
};
