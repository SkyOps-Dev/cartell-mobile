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

// react-native-gesture-handler (its published jestSetup.js mocks its native module) asks Worklets
// for the UI runtime as it loads; Worklets' test build has none and throws. Any object will do,
// since the mocked module ignores it.
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  getUIRuntimeHolder: () => ({}),
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

// Detect Location (src/services/geolocator.ts): by default location on, permission granted, and a
// fix at a fixed point. Edit Coordinates tests replace these.
require('react-native').NativeModules.CartellGeolocator = {
  isLocationServiceEnabled: jest.fn(async () => true),
  checkPermission: jest.fn(async () => 'whileInUse'),
  requestPermission: jest.fn(async () => 'whileInUse'),
};
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: jest.fn(),
    getCurrentPosition: jest.fn(success =>
      success({ coords: { latitude: 40.7127753, longitude: -74.0059728 } }),
    ),
  },
}));

// react-native-vision-camera and its barcode scanner are Nitro native modules; tests drive the
// stand-ins in __tests__/helpers/visionCameraMock.tsx.
jest.mock('react-native-vision-camera', () => {
  const mock = require('./__tests__/helpers/visionCameraMock');
  return {
    Camera: mock.Camera,
    useCameraPermission: mock.useCameraPermission,
  };
});
jest.mock('react-native-vision-camera-barcode-scanner', () => ({
  useBarcodeScannerOutput: require('./__tests__/helpers/visionCameraMock')
    .useBarcodeScannerOutput,
}));
