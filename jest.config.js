module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setupAfterEnv.js'],
  // Reanimated and Worklets ship .native files the test environment must not pick up; this
  // resolver (Reanimated's, which chains Worklets') keeps them out.
  resolver: 'react-native-reanimated/jest/resolver.js',
  // The preset transforms only react-native itself; react-native-keyboard-controller's mock (and
  // other react-native-* packages) ship ES modules too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-[a-z-]+)?|@react-native(-community)?)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/'],
  moduleNameMapper: {
    // Tests never read the selected build environment (which holds secrets); they get a fixed
    // TEST environment with no hub keys, so the Flutter defaults apply.
    '^./env.generated.json$': '<rootDir>/src/config/__fixtures__/env.test.json',
  },
};
