/// <reference types="node" />
// The history screens' rotation setting (PhoneRotationManager().allowAll(); spec 18 §2): its
// native wiring. Missing, the app would build and run, and only rotation on a phone would differ.

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');

describe('Android', () => {
  test('OrientationModule is registered in CartellPackage', () => {
    expect(
      read('android/app/src/main/java/com/iwatllc/cartell/CartellPackage.kt'),
    ).toContain('OrientationModule(reactContext)');
  });

  test('it is the CartellOrientation module, and asks for FULL_USER as Flutter’s engine does', () => {
    const module = read(
      'android/app/src/main/java/com/iwatllc/cartell/OrientationModule.kt',
    );
    expect(module).toContain(
      'override fun getName(): String = "CartellOrientation"',
    );
    expect(module).toContain('fun allowAll()');
    expect(module).toContain('ActivityInfo.SCREEN_ORIENTATION_FULL_USER');
  });

  test('the manifest does not lock the orientation (Flutter’s does not either)', () => {
    expect(read('android/app/src/main/AndroidManifest.xml')).not.toContain(
      'android:screenOrientation',
    );
  });
});

describe('iOS (written, not yet built: no Mac)', () => {
  test('OrientationModule.m is in the Xcode project and its Sources phase', () => {
    const pbxproj = read('ios/Cartell.xcodeproj/project.pbxproj');
    expect(pbxproj).toContain(
      '/* OrientationModule.m in Sources */ = {isa = PBXBuildFile; fileRef = A1CF0EDB000000000000000A',
    );
    expect(pbxproj).toContain('path = Cartell/OrientationModule.m;');
    expect(
      pbxproj.match(
        /A1CF0EDB0000000000000009 \/\* OrientationModule\.m in Sources \*\//g,
      ),
    ).toHaveLength(2);
  });

  test('the module answers allowAll', () => {
    const source = read('ios/Cartell/OrientationModule.m');
    expect(source).toContain('RCT_EXPORT_MODULE(CartellOrientation)');
    expect(source).toContain('RCT_EXPORT_METHOD(allowAll)');
  });
});
