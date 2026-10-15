// Port of Flutter's Feedback.forLongPress on iOS (widgets/feedback.dart): the keyboard click
// system sound plus a heavy impact, as Flutter's engine plays them (FlutterPlatformPlugin:
// AudioServicesPlaySystemSound(1104) for SystemSoundType.click, UIImpactFeedbackGenerator with
// UIImpactFeedbackStyleHeavy for HapticFeedback.heavyImpact). The Android side is
// android/.../FeedbackModule.kt; both are called through src/services/feedback.ts.

#import <AudioToolbox/AudioToolbox.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface CartellFeedback : NSObject <RCTBridgeModule>
@end

@implementation CartellFeedback

RCT_EXPORT_MODULE(CartellFeedback)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(forLongPress)
{
  AudioServicesPlaySystemSound(1104);
  UIImpactFeedbackGenerator *generator =
      [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleHeavy];
  [generator impactOccurred];
}

@end
