// Port of the history screens' PhoneRotationManager().allowAll() on iOS (frontend/lib/screens/
// events/phone_rotation_manager.dart): SystemChrome.setPreferredOrientations with all four
// orientations. Flutter's engine sets its view controller's supported orientations to all four and
// asks UIKit to re-evaluate them. UIKit only allows what the Info.plist also lists (iPhone:
// portrait and both landscapes; iPad: all four), and React Native's root view controller already
// allows that same set, so the visible result is unchanged on both. Only the re-evaluation is
// copied here. Written without a Mac: not compiled or tried on a device yet (PARITY_ISSUES).
// The Android side is android/.../OrientationModule.kt; both are called through
// src/services/phoneRotationManager.ts.

#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface CartellOrientation : NSObject <RCTBridgeModule>
@end

@implementation CartellOrientation

RCT_EXPORT_MODULE(CartellOrientation)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(allowAll)
{
  if (@available(iOS 16.0, *)) {
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
      if (![scene isKindOfClass:[UIWindowScene class]]) {
        continue;
      }
      for (UIWindow *window in ((UIWindowScene *)scene).windows) {
        [window.rootViewController setNeedsUpdateOfSupportedInterfaceOrientations];
      }
    }
  } else {
    [UIViewController attemptRotationToDeviceOrientation];
  }
}

@end
