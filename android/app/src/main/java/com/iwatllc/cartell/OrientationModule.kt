package com.iwatllc.cartell

import android.content.pm.ActivityInfo
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Port of the history screens' PhoneRotationManager().allowAll() (frontend/lib/screens/events/
// phone_rotation_manager.dart): SystemChrome.setPreferredOrientations with all four orientations,
// which Flutter's engine (PlatformPlugin.setSystemChromePreferredOrientations) passes to
// Activity.setRequestedOrientation as SCREEN_ORIENTATION_FULL_USER. Measured on the RMX5070
// (2026-11-17): UNSPECIFIED at start, FULL_USER once a history screen opens, and it stays so (no
// screen sets it back). The iOS side is ios/Cartell/OrientationModule.m; both are called through
// src/services/phoneRotationManager.ts.
class OrientationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartellOrientation"

  @ReactMethod
  fun allowAll() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_USER
    }
  }
}
