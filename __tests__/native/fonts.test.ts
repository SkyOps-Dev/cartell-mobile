// Every font in assets/fonts must reach both apps: Android reads it from its assets folder, iOS
// needs it in the Xcode project's resources and in Info.plist's UIAppFonts. A font missing on one
// side falls back to the system font there without any error (spec 01 §4).

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');
const fonts = fs.readdirSync(path.join(root, 'assets/fonts'));

test.each(fonts)('%s is bundled on Android and iOS', font => {
  expect(
    fs.existsSync(path.join(root, 'android/app/src/main/assets/fonts', font)),
  ).toBe(true);
  expect(read('ios/Cartell/Info.plist')).toContain(`<string>${font}</string>`);
  const pbxproj = read('ios/Cartell.xcodeproj/project.pbxproj');
  expect(pbxproj).toContain(
    `/* ${font} in Resources */ = {isa = PBXBuildFile;`,
  );
  expect(pbxproj).toContain(`path = "../assets/fonts/${font}";`);
});

test('Source Sans Pro is there (the Hubs title and subtitle)', () => {
  expect(fonts).toContain('SourceSansPro-Regular.ttf');
});
