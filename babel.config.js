module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated 4 runs its frame-by-frame code as worklets; this plugin must stay last.
  plugins: ['react-native-worklets/plugin'],
};
