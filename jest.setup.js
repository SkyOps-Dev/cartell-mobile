/* eslint-env jest */
// Test stand-ins for native modules that do not exist under Jest.

// react-native-keychain: an in-memory store keyed by service, so storage behaviour is testable.
jest.mock('react-native-keychain', () => {
  const store = new Map();
  return {
    __store: store,
    setGenericPassword: jest.fn(async (username, password, { service }) => {
      store.set(service, { username, password, service });
      return true;
    }),
    getGenericPassword: jest.fn(
      async ({ service }) => store.get(service) ?? false,
    ),
    resetGenericPassword: jest.fn(async ({ service }) => store.delete(service)),
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  InAppBrowser: {
    isAvailable: jest.fn(async () => true),
    open: jest.fn(async () => ({ type: 'cancel' })),
  },
}));

// Keyboard animation: keyboard-controller's published mock. Reanimated runs its own JS
// implementation under Jest (set up in jest.setupAfterEnv.js).
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);

// The app's own version reader (src/services/packageInfo.ts), answering what the build declares.
require('react-native').NativeModules.CartellPackageInfo = {
  fromPlatform: jest.fn(async () => ({
    version: '1.12.5',
    buildNumber: '193',
  })),
};

// The biometric prompt (src/services/localAuth.ts): by default a phone with no screen lock and no
// biometrics, so nothing is offered. Biometric tests replace these.
require('react-native').NativeModules.CartellLocalAuth = {
  isDeviceSupported: jest.fn(async () => false),
  getEnrolledBiometrics: jest.fn(async () => []),
  authenticate: jest.fn(async () => 'failure'),
};
