// Port of Flutter's Feedback.forLongPress (widgets/feedback.dart), through the CartellFeedback
// native module, as Flutter's engine does it on each platform:
// - Android: the system long-press haptic (android/.../FeedbackModule.kt).
// - iOS: the keyboard click sound plus a heavy impact (ios/Cartell/FeedbackModule.m). Written
//   without a Mac: not compiled or felt on an iPhone yet (PARITY_ISSUES P12).

import { NativeModules } from 'react-native';

type CartellFeedback = { forLongPress(): void };

export function forLongPress(): void {
  (
    NativeModules.CartellFeedback as CartellFeedback | undefined
  )?.forLongPress();
}
