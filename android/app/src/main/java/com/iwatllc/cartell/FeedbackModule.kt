package com.iwatllc.cartell

import android.view.HapticFeedbackConstants
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Flutter's Feedback.forLongPress on Android: HapticFeedback.vibrate(), which Flutter's engine
// (PlatformPlugin.vibrateHapticFeedback, STANDARD) turns into the system long-press haptic on the
// window's decor view. React Native has no built-in equivalent. It needs no VIBRATE permission.
class FeedbackModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartellFeedback"

  @ReactMethod
  fun forLongPress() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      activity.window?.decorView?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }
  }
}
