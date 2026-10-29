/// <reference types="node" />
// Ported from frontend/test/native_biometric_config_test.dart
//
// These native facts fail only at runtime, on a device, the first time a user taps the feature,
// and nothing else in the JS build notices them going away.

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');

describe('Android: the biometric prompt needs a FragmentActivity host', () => {
  const source = read(
    'android/app/src/main/java/com/iwatllc/cartell/MainActivity.kt',
  );

  test('MainActivity extends ReactActivity', () => {
    // androidx.biometric needs a FragmentActivity. ReactActivity extends AppCompatActivity,
    // which is one (the Flutter app needed FlutterFragmentActivity for the same reason).
    expect(source).toMatch(/class\s+MainActivity\s*:\s*ReactActivity\(\)/);
  });

  test('it imports ReactActivity, not a plain Activity host', () => {
    expect(source).toContain('import com.facebook.react.ReactActivity');
    expect(source).not.toMatch(/import\s+android\.app\.Activity\b/);
  });
});

describe('Android: the biometric prompt needs an AppCompat launch theme', () => {
  // minSdkVersion is 24, and on API 24–27 a non-AppCompat theme crashes the biometric prompt.
  for (const dir of ['values', 'values-night']) {
    test(`${dir}/styles.xml themes descend from Theme.AppCompat`, () => {
      const styles = read(`android/app/src/main/res/${dir}/styles.xml`);
      const parents = [
        ...styles.matchAll(
          /<style name="(LaunchTheme|NormalTheme)" parent="([^"]+)"/g,
        ),
      ];

      expect(parents).toHaveLength(2);
      for (const match of parents) {
        expect(match[2].startsWith('Theme.AppCompat')).toBe(true);
      }
    });
  }
});

describe('Android: the AppCompat switch has two side effects', () => {
  test('appcompat comes from a declared dependency, not a lucky transitive', () => {
    // styles.xml links against Theme.AppCompat. In Flutter it resolved only through
    // androidx.biometric, so the app declared it. Here react-android declares it as an `api`
    // dependency (ReactActivity is an AppCompatActivity), so depending on react-android is
    // the declaration.
    const gradle = read('android/app/build.gradle');
    expect(gradle).toContain('com.facebook.react:react-android');
    const reactAndroidGradle = read(
      'node_modules/react-native/ReactAndroid/build.gradle.kts',
    );
    expect(reactAndroidGradle).toContain('api(libs.androidx.appcompat)');
  });

  for (const dir of ['values', 'values-night']) {
    test(`${dir} NormalTheme names its window background literally`, () => {
      // Comments stripped: the file explains why the attribute is not used.
      const styles = read(`android/app/src/main/res/${dir}/styles.xml`).replace(
        /<!--[\s\S]*?-->/g,
        '',
      );
      // ?android:colorBackground is #303030 under Theme.AppCompat and flashes grey behind
      // Cartell's #0A0E21 ground during init.
      expect(styles).not.toContain('?android:colorBackground');
      expect(styles).toContain(
        '<item name="android:windowBackground">#FF0A0E21</item>',
      );
    });
  }
});

describe('iOS: Password AutoFill needs the domain association', () => {
  const entitlements = read('ios/Cartell/Cartell.entitlements');

  test('every environment host is declared for webcredentials', () => {
    for (const host of [
      'cartellap.com',
      'test.cartellap.com',
      'beta.cartellap.com',
    ]) {
      expect(entitlements).toContain(`<string>webcredentials:${host}</string>`);
    }
  });

  test('the entitlement declares no duplicate keys', () => {
    const keys = [...entitlements.matchAll(/<key>([^<]+)<\/key>/g)].map(
      m => m[1],
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('iOS: Face ID needs a usage description', () => {
  const plist = read('ios/Cartell/Info.plist');

  test('NSFaceIDUsageDescription is present', () => {
    // Without it iOS terminates the app the first time Face ID is invoked.
    expect(plist).toContain('<key>NSFaceIDUsageDescription</key>');
  });

  test('and it is a non-empty string the user can read', () => {
    const match = plist.match(
      /<key>NSFaceIDUsageDescription<\/key>\s*<string>([^<]*)<\/string>/,
    );
    expect(match).not.toBeNull();
    expect(match![1].trim().length).toBeGreaterThan(20);
  });
});

describe('the biometric prompt module is in both builds', () => {
  test('Android: androidx.biometric at local_auth_android 1.0.56’s version', () => {
    expect(read('android/app/build.gradle')).toContain(
      'implementation("androidx.biometric:biometric:1.1.0")',
    );
  });

  test('Android: LocalAuthModule is registered', () => {
    expect(
      read('android/app/src/main/java/com/iwatllc/cartell/CartellPackage.kt'),
    ).toContain('LocalAuthModule(reactContext)');
  });

  test('Android: the "go to settings" dialog’s layout and theme exist', () => {
    const layout = read(
      'android/app/src/main/res/layout/local_auth_go_to_setting.xml',
    );
    expect(layout).toContain('@+id/local_auth_fingerprint_required');
    expect(layout).toContain('@+id/local_auth_go_to_setting_description');
    expect(read('android/app/src/main/res/values/local_auth.xml')).toContain(
      '<style name="LocalAuthAlertDialogCustom"',
    );
  });

  test('iOS: LocalAuthModule.m is compiled into the app', () => {
    const project = read('ios/Cartell.xcodeproj/project.pbxproj');
    expect(project).toMatch(/LocalAuthModule\.m in Sources \*\/,/);
    expect(read('ios/Cartell/LocalAuthModule.m')).toContain(
      'RCT_EXPORT_MODULE(CartellLocalAuth)',
    );
  });
});
