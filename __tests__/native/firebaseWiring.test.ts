/// <reference types="node" />
// Firebase's native set-up (spec 09; FEATURES_FRONTEND F10). Missing, the app would still build
// and run: Firebase would not start, or background alerts would look different, and only a phone
// would show it.

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');

type GoogleServices = {
  project_info: { project_id: string };
  client: { client_info: { android_client_info: { package_name: string } } }[];
};
const googleServices = (file: string): GoogleServices =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as GoogleServices;
const packageNames = (config: GoogleServices) =>
  config.client.map(c => c.client_info.android_client_info.package_name);

describe('Android', () => {
  test('the Google services plugin is on the build path and applied to the app', () => {
    expect(read('android/build.gradle')).toContain(
      'classpath("com.google.gms:google-services:',
    );
    expect(read('android/app/build.gradle')).toContain(
      'apply plugin: "com.google.gms.google-services"',
    );
  });

  // app/google-services.json is a byte-for-byte copy of Flutter's
  // (frontend/android/app/google-services.json), checked when it was copied (2026-11-18).
  test('the real app’s config file is the registered Firebase app', () => {
    const standard = googleServices(
      path.join(root, 'android/app/google-services.json'),
    );
    expect(packageNames(standard)).toEqual(['com.iwatllc.cartell']);
    expect(standard.project_info.project_id).toBe('cartell-6307a');
  });

  test('the dev copy’s config file is the same Firebase app under its own package name', () => {
    const standard = googleServices(
      path.join(root, 'android/app/google-services.json'),
    );
    const rn = googleServices(
      path.join(root, 'android/app/src/rn/google-services.json'),
    );
    expect(packageNames(rn)).toEqual(['com.iwatllc.cartell.rn']);
    // Everything else is unchanged.
    rn.client[0].client_info.android_client_info.package_name =
      'com.iwatllc.cartell';
    expect(rn).toEqual(standard);
  });

  test('Analytics is in the real app only (decision D8; the dev copy reports nothing)', () => {
    const gradle = read('android/app/build.gradle');
    expect(gradle).toContain(
      'standardImplementation("com.google.firebase:firebase-analytics")',
    );
    expect(gradle).not.toMatch(
      /^\s*(implementation|rnImplementation)\(.*firebase-analytics/m,
    );
  });

  test('the manifest declares the notification permissions Flutter’s plugins merge in', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain(
      '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    );
    expect(manifest).toContain(
      '<uses-permission android:name="android.permission.VIBRATE" />',
    );
  });

  test('RNFB’s default channel, colour and delegation switch are removed (Flutter sets none; spec 09 §4)', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    for (const name of [
      'com.google.firebase.messaging.default_notification_channel_id',
      'com.google.firebase.messaging.default_notification_color',
      'firebase_messaging_notification_delegation_enabled',
    ]) {
      expect(manifest).toMatch(
        new RegExp(
          `<meta-data\\s+android:name="${name.replace(
            /\./g,
            '\\.',
          )}"\\s+tools:node="remove" />`,
        ),
      );
    }
    expect(manifest).toContain(
      'xmlns:tools="http://schemas.android.com/tools"',
    );
  });
});

describe('iOS (written, not yet built: no Mac)', () => {
  // A byte-for-byte copy of Flutter's frontend/ios/Runner/GoogleService-Info.plist, checked when
  // it was copied (2026-11-18). There is no iOS dev copy: the bundle id is the real app's.
  test('GoogleService-Info.plist is the registered Firebase app', () => {
    const plist = read('ios/Cartell/GoogleService-Info.plist');
    expect(plist).toMatch(
      /<key>BUNDLE_ID<\/key>\s*<string>com\.iwatllc\.cartell<\/string>/,
    );
    expect(plist).toMatch(
      /<key>PROJECT_ID<\/key>\s*<string>cartell-6307a<\/string>/,
    );
    expect(plist).toMatch(/<key>IS_GCM_ENABLED<\/key>\s*<true(\/>|><\/true>)/);
  });

  test('it is in the Xcode project, its group and its Resources phase', () => {
    const pbxproj = read('ios/Cartell.xcodeproj/project.pbxproj');
    expect(pbxproj).toContain(
      '/* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = A1CF0EDB000000000000000C',
    );
    expect(pbxproj).toContain('path = "Cartell/GoogleService-Info.plist";');
    // The build file: defined once, listed once in the Resources phase.
    expect(
      pbxproj.match(
        /A1CF0EDB000000000000000B \/\* GoogleService-Info\.plist in Resources \*\//g,
      ),
    ).toHaveLength(2);
    // The file reference: defined once, in the Cartell group once, and named by the build file.
    expect(
      pbxproj.match(
        /A1CF0EDB000000000000000C \/\* GoogleService-Info\.plist \*\//g,
      ),
    ).toHaveLength(3);
  });

  test('Firebase starts first thing at launch', () => {
    const delegate = read('ios/Cartell/AppDelegate.swift');
    expect(delegate).toContain('import FirebaseCore');
    const configure = delegate.indexOf('FirebaseApp.configure()');
    expect(configure).toBeGreaterThan(-1);
    expect(configure).toBeLessThan(delegate.indexOf('RCTReactNativeFactory('));
  });

  test('pods are built as static frameworks, as the Firebase iOS SDK needs', () => {
    const podfile = read('ios/Podfile');
    expect(podfile).toContain('use_frameworks! :linkage => :static');
    expect(podfile).toContain('$RNFirebaseAsStaticFramework = true');
  });

  test('push entitlement and background modes are as Flutter’s', () => {
    expect(read('ios/Cartell/Cartell.entitlements')).toMatch(
      /<key>aps-environment<\/key>\s*<string>development<\/string>/,
    );
    expect(read('ios/Cartell/Info.plist')).toMatch(
      /<key>UIBackgroundModes<\/key>\s*<array>\s*<string>remote-notification<\/string>\s*<string>fetch<\/string>\s*<\/array>/,
    );
  });
});
