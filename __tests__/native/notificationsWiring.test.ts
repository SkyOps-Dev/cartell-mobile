/// <reference types="node" />
// The app's own alert (NotificationApi; flutter_local_notifications 18.0.1; spec 09 §3): its
// native wiring and the values Flutter's alert is drawn with. Missing or changed, the app would
// still build and run, and only an alert on a phone would show it.

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');

describe('Android', () => {
  const module = () =>
    read(
      'android/app/src/main/java/com/iwatllc/cartell/NotificationsModule.kt',
    );

  test('NotificationsModule is registered in CartellPackage as CartellNotifications', () => {
    expect(
      read('android/app/src/main/java/com/iwatllc/cartell/CartellPackage.kt'),
    ).toContain('NotificationsModule(reactContext)');
    expect(module()).toContain(
      'override fun getName(): String = "CartellNotifications"',
    );
  });

  test('the channel is "?" / "Miscellaneous" at importance max, created only if missing', () => {
    const source = module();
    expect(source).toContain('const val CHANNEL_ID = "?"');
    expect(source).toContain('const val CHANNEL_NAME = "Miscellaneous"');
    expect(source).toContain(
      'const val IMPORTANCE_MAX = NotificationManager.IMPORTANCE_MAX',
    );
    expect(source).toContain(
      'if (manager.getNotificationChannel(CHANNEL_ID) != null) return',
    );
    expect(source).toContain('channel.enableVibration(true)');
    expect(source).toContain('channel.enableLights(false)');
    expect(source).toContain('channel.setShowBadge(true)');
    expect(source).toContain('AudioAttributes.USAGE_NOTIFICATION');
  });

  test('the alert: launcher icon, cancelled on tap, the default sound, no colour, posted by id', () => {
    const source = module();
    expect(source).toContain('.setSmallIcon(R.mipmap.ic_launcher)');
    expect(source).toContain('.setAutoCancel(true)');
    expect(source).toContain(
      '.setPriority(NotificationCompat.PRIORITY_DEFAULT)',
    );
    expect(source).toContain('.setShowWhen(true)');
    expect(source).toContain(
      '.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))',
    );
    expect(source).not.toMatch(/\.setColor\(/);
    expect(source).toContain(
      'NotificationManagerCompat.from(context).notify(notificationId,',
    );
  });

  test('a tap opens the app through its launch intent', () => {
    const source = module();
    expect(source).toContain('getLaunchIntentForPackage(context.packageName)');
    expect(source).toContain(
      'PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE',
    );
  });
});

describe('iOS: the model name sent with the push token (written, not yet built: no Mac)', () => {
  test('DeviceInfoModule.m is in the Xcode project and its Sources phase', () => {
    const pbxproj = read('ios/Cartell.xcodeproj/project.pbxproj');
    expect(pbxproj).toContain(
      '/* DeviceInfoModule.m in Sources */ = {isa = PBXBuildFile; fileRef = A1CF0EDB0000000000000010',
    );
    expect(pbxproj).toContain('path = Cartell/DeviceInfoModule.m;');
    expect(
      pbxproj.match(
        /A1CF0EDB000000000000000F \/\* DeviceInfoModule\.m in Sources \*\//g,
      ),
    ).toHaveLength(2);
    expect(
      pbxproj.match(/A1CF0EDB0000000000000010 \/\* DeviceInfoModule\.m \*\//g),
    ).toHaveLength(3);
  });

  test('it carries device_info_plus 11.5.0’s whole table, "Unknown device" included', () => {
    const source = read('ios/Cartell/DeviceInfoModule.m');
    expect(source).toContain('RCT_EXPORT_MODULE(CartellDeviceInfo)');
    // 125 machine identifiers mapped to 74 names, plus the fallback (checked line for line against
    // DeviceIdentifiers.m when it was copied, 2026-11-18).
    expect(source.match(/isEqualToString:@"[^"]*"/g)).toHaveLength(125);
    expect(source.match(/return @"[^"]*"/g)).toHaveLength(75);
    expect(source).toContain('return @"Unknown device";');
    expect(source).toContain('SIMULATOR_MODEL_IDENTIFIER');
    expect(source).toContain('uname(&un);');
  });
});

describe('iOS (written, not yet built: no Mac)', () => {
  test('NotificationsModule.m is in the Xcode project and its Sources phase', () => {
    const pbxproj = read('ios/Cartell.xcodeproj/project.pbxproj');
    expect(pbxproj).toContain(
      '/* NotificationsModule.m in Sources */ = {isa = PBXBuildFile; fileRef = A1CF0EDB000000000000000E',
    );
    expect(pbxproj).toContain('path = Cartell/NotificationsModule.m;');
    expect(
      pbxproj.match(
        /A1CF0EDB000000000000000D \/\* NotificationsModule\.m in Sources \*\//g,
      ),
    ).toHaveLength(2);
    expect(
      pbxproj.match(
        /A1CF0EDB000000000000000E \/\* NotificationsModule\.m \*\//g,
      ),
    ).toHaveLength(3);
  });

  test('the module asks for sound, alert and badge, and marks its alerts as its own', () => {
    const source = read('ios/Cartell/NotificationsModule.m');
    expect(source).toContain('RCT_EXPORT_MODULE(CartellNotifications)');
    expect(source).toContain(
      'UNAuthorizationOptionSound + UNAuthorizationOptionAlert + UNAuthorizationOptionBadge',
    );
    expect(source).toContain(
      'content.sound = UNNotificationSound.defaultSound;',
    );
    expect(source).toContain(
      'static NSString *const kCartellLocalNotification = @"cartellLocalNotification";',
    );
    expect(source).toContain('requestWithIdentifier:[identifier stringValue]');
  });

  test('AppDelegate answers while the app is open, set during launch as Flutter’s is', () => {
    const delegate = read('ios/Cartell/AppDelegate.swift');
    expect(delegate).toContain('UNUserNotificationCenterDelegate');
    const set = delegate.indexOf(
      'UNUserNotificationCenter.current().delegate = self',
    );
    expect(set).toBeGreaterThan(delegate.indexOf('FirebaseApp.configure()'));
    expect(set).toBeLessThan(delegate.indexOf('RCTReactNativeFactory('));
    expect(delegate).toContain('userInfo["cartellLocalNotification"] != nil');
    expect(delegate).toContain(
      'completionHandler([.banner, .list, .sound, .badge])',
    );
    expect(delegate).toContain('completionHandler([])');
  });
});
