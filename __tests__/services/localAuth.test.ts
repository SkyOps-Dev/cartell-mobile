// The local_auth port (src/services/localAuth.ts) and BiometricService on top of it
// (biometric_service.dart): what is sent to the native prompt, and how each native answer becomes
// true / false / an error code, then an outcome.

import { NativeModules, Platform } from 'react-native';

import {
  BiometricOutcome,
  BiometricService,
} from '../../src/services/biometricService';
import {
  LocalAuthentication,
  LocalAuthError,
  MissingPluginError,
} from '../../src/services/localAuth';

type Native = {
  isDeviceSupported: jest.Mock;
  getEnrolledBiometrics: jest.Mock;
  authenticate: jest.Mock;
};
const original = NativeModules.CartellLocalAuth;
let native: Native;

beforeEach(() => {
  native = {
    isDeviceSupported: jest.fn(async () => true),
    getEnrolledBiometrics: jest.fn(async () => ['weak']),
    authenticate: jest.fn(async () => 'success'),
  };
  NativeModules.CartellLocalAuth = native;
});
afterEach(() => {
  NativeModules.CartellLocalAuth = original;
  jest.restoreAllMocks();
});

const service = new BiometricService();

describe('Android', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));

  test('sends the app’s options and local_auth’s default English strings', async () => {
    await service.authenticate({ reason: 'Unlock Cartell' });
    expect(native.authenticate).toHaveBeenCalledWith(
      {
        biometricOnly: false,
        sensitiveTransaction: true,
        sticky: true,
        useErrorDialogs: true,
      },
      {
        reason: 'Unlock Cartell',
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
      },
    );
  });

  test.each([
    ['success', BiometricOutcome.success],
    ['failure', BiometricOutcome.failed],
    ['errorNotAvailable', BiometricOutcome.unavailable],
    ['errorNotEnrolled', BiometricOutcome.unavailable],
    ['errorLockedOutTemporarily', BiometricOutcome.lockedOut],
    ['errorLockedOutPermanently', BiometricOutcome.lockedOut],
    ['errorAlreadyInProgress', BiometricOutcome.failed],
    ['errorNoActivity', BiometricOutcome.failed],
    ['errorNotFragmentActivity', BiometricOutcome.failed],
  ])('the native result %s is the outcome %s', async (result, outcome) => {
    native.authenticate.mockResolvedValue(result);
    expect(await service.authenticate({ reason: 'Unlock Cartell' })).toBe(
      outcome,
    );
  });

  test('errors carry the plugin’s PlatformException codes', async () => {
    native.authenticate.mockResolvedValue('errorLockedOutTemporarily');
    await expect(
      LocalAuthentication.authenticate({ localizedReason: 'x' }),
    ).rejects.toMatchObject({ code: 'LockedOut' });
  });
});

describe('iOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  test('sends the app’s options and IOSAuthMessages’ defaults', async () => {
    native.authenticate.mockResolvedValue({ result: 'success' });
    await service.authenticate({ reason: 'Unlock Cartell' });
    expect(native.authenticate).toHaveBeenCalledWith(
      { biometricOnly: false, sticky: true, useErrorDialogs: true },
      {
        reason: 'Unlock Cartell',
        lockOut:
          'Biometric authentication is disabled. Please lock and unlock your screen to enable it.',
        goToSettingsButton: 'Go to settings',
        goToSettingsDescription:
          'Biometric authentication is not set up on your device. Please either enable Touch ID or Face ID on your phone.',
        cancelButton: 'OK',
      },
    );
  });

  test.each([
    ['success', BiometricOutcome.success],
    // A lockout shows the plugin's own alert and then reports a plain failure.
    ['failure', BiometricOutcome.failed],
    ['errorNotAvailable', BiometricOutcome.unavailable],
    ['errorNotEnrolled', BiometricOutcome.unavailable],
    ['errorPasscodeNotSet', BiometricOutcome.unavailable],
    ['errorUserCancelled', BiometricOutcome.failed],
    ['errorUserFallback', BiometricOutcome.failed],
    // Not one of the codes BiometricService treats as unavailable, as in Flutter.
    ['errorBiometricNotAvailable', BiometricOutcome.failed],
  ])('the native result %s is the outcome %s', async (result, outcome) => {
    native.authenticate.mockResolvedValue({ result, errorMessage: 'm' });
    expect(await service.authenticate({ reason: 'Unlock Cartell' })).toBe(
      outcome,
    );
  });
});

describe('BiometricService.isAvailable: worth offering only with a real enrolment', () => {
  test('a supported device with an enrolled biometric', async () => {
    expect(await service.isAvailable()).toBe(true);
  });

  test('a screen lock without any enrolled biometric is not enough', async () => {
    native.getEnrolledBiometrics.mockResolvedValue([]);
    expect(await service.isAvailable()).toBe(false);
  });

  test('an unsupported device is never asked for its enrolments', async () => {
    native.isDeviceSupported.mockResolvedValue(false);
    expect(await service.isAvailable()).toBe(false);
    expect(native.getEnrolledBiometrics).not.toHaveBeenCalled();
  });

  test('a platform error reads as unavailable', async () => {
    native.isDeviceSupported.mockRejectedValue(new LocalAuthError('x'));
    expect(await service.isAvailable()).toBe(false);
  });

  test('a missing native module is not a platform error: it is thrown on', async () => {
    NativeModules.CartellLocalAuth = undefined;
    await expect(service.isAvailable()).rejects.toBeInstanceOf(
      MissingPluginError,
    );
  });
});
