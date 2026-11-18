// Port of the app's in-app alert (frontend/lib/services/notifications.dart, NotificationApi) as
// flutter_local_notifications 18.0.1 does it on iOS (FlutterLocalNotificationsPlugin.m: initialize,
// requestPermissionsImpl, show, buildStandardNotificationContent). Spec 09 §3.
// - initialize: DarwinInitializationSettings(requestAlertPermission, requestSoundPermission,
//   requestBadgePermission: true) asks for sound, alert and badge every time. iOS shows its prompt
//   only while the user has not answered yet. This is the app's only iOS prompt: Flutter's
//   permission_handler is built without its notification part (PERMISSION_NOTIFICATIONS unset),
//   so its request does nothing there.
// - show: title, body and the default sound (presentSound: true), under the id as a string, so
//   the app's "0" replaces the previous alert. The userInfo marks it as the app's own, which
//   AppDelegate.swift reads when iOS asks whether to show it while the app is open.
// The plugin also stores its default presentation options at initialize and reads them back in
// show; they only matter for an alert shown before any initialize ever ran, which the app cannot
// do (an alert needs a registered token, and registering follows initialize), so they are not
// stored here. Written without a Mac: not compiled or tried on a device yet (PARITY_ISSUES).
// The Android side is android/.../NotificationsModule.kt; both are called through
// src/services/notifications.ts.

#import <React/RCTBridgeModule.h>
#import <UserNotifications/UserNotifications.h>

// Read by AppDelegate.swift (willPresent).
static NSString *const kCartellLocalNotification = @"cartellLocalNotification";

@interface CartellNotifications : NSObject <RCTBridgeModule>
@end

@implementation CartellNotifications

RCT_EXPORT_MODULE(CartellNotifications)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(initialize : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
{
  UNAuthorizationOptions options =
      UNAuthorizationOptionSound + UNAuthorizationOptionAlert + UNAuthorizationOptionBadge;
  [[UNUserNotificationCenter currentNotificationCenter]
      requestAuthorizationWithOptions:options
                    completionHandler:^(BOOL granted, NSError *_Nullable error) {
                      resolve(@(granted));
                    }];
}

RCT_EXPORT_METHOD(show
                  : (double)notificationId title
                  : (NSString *)title body
                  : (NSString *)body resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
  if (title != nil) {
    content.title = title;
  }
  if (body != nil) {
    content.body = body;
  }
  content.sound = UNNotificationSound.defaultSound;
  NSNumber *identifier = @((NSInteger)notificationId);
  content.userInfo = @{kCartellLocalNotification : @YES};

  UNNotificationRequest *request =
      [UNNotificationRequest requestWithIdentifier:[identifier stringValue]
                                           content:content
                                           trigger:nil];
  [[UNUserNotificationCenter currentNotificationCenter]
      addNotificationRequest:request
       withCompletionHandler:^(NSError *_Nullable error) {
         if (error == nil) {
           resolve(nil);
           return;
         }
         reject([NSString stringWithFormat:@"Error %ld", (long)error.code],
                error.localizedDescription, error);
       }];
}

@end
