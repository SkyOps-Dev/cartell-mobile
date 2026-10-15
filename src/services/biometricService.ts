// Port of frontend/lib/services/biometric_service.dart: a thin wrapper over local_auth
// (src/services/localAuth.ts), so the state machine never sees a platform error and the feature
// can be faked in a test.

import {
  AuthErrorCodes,
  LocalAuthentication,
  LocalAuthError,
} from './localAuth';

/**
 * What a biometric prompt actually told us, as opposed to a bare bool. The distinction that
 * matters is `unavailable` versus `failed`: the first means the user turned this on and later
 * removed the enrolment at the OS level, which is ours to clean up; the second means they are
 * standing there failing to unlock, which is theirs.
 */
export enum BiometricOutcome {
  /** Identity confirmed. */
  success = 'success',
  /** Cancelled, or not recognised. The user is present; let them retry or use a password. */
  failed = 'failed',
  /** Too many attempts. Retrying is pointless until the OS relents, so offer the password. */
  lockedOut = 'lockedOut',
  /** The device can no longer do this at all. Never a reason to keep someone out. */
  unavailable = 'unavailable',
}

export class BiometricService {
  /**
   * Whether it is worth *offering* biometric unlock on this device. Deliberately stricter than
   * what authenticate will accept: it needs a real enrolled face or fingerprint, because offering
   * "use your fingerprint" to someone who has only a PIN is a promise the device cannot keep.
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!(await LocalAuthentication.isDeviceSupported())) {
        return false;
      }
      const enrolled = await LocalAuthentication.getAvailableBiometrics();
      return enrolled.length > 0;
    } catch (error) {
      // `on PlatformException`: anything else is thrown on.
      if (error instanceof LocalAuthError) {
        return false;
      }
      throw error;
    }
  }

  async authenticate({
    reason,
  }: {
    reason: string;
  }): Promise<BiometricOutcome> {
    try {
      const ok = await LocalAuthentication.authenticate({
        localizedReason: reason,
        options: {
          // The device credential stays allowed on purpose: a user who enables this and later
          // removes their fingerprint should meet their PIN, not a wall.
          biometricOnly: false,
          stickyAuth: true,
          useErrorDialogs: true,
        },
      });
      return ok ? BiometricOutcome.success : BiometricOutcome.failed;
    } catch (error) {
      if (!(error instanceof LocalAuthError)) {
        throw error;
      }
      switch (error.code) {
        case AuthErrorCodes.notAvailable:
        case AuthErrorCodes.notEnrolled:
        case AuthErrorCodes.passcodeNotSet:
        case AuthErrorCodes.otherOperatingSystem:
          return BiometricOutcome.unavailable;
        case AuthErrorCodes.lockedOut:
        case AuthErrorCodes.permanentlyLockedOut:
          return BiometricOutcome.lockedOut;
        default:
          return BiometricOutcome.failed;
      }
    }
  }
}
