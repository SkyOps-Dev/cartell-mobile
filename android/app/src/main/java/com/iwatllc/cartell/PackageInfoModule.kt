package com.iwatllc.cartell

import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Flutter's PackageInfo.fromPlatform() on Android (package_info_plus): the installed package's
// versionName and its long version code. React Native has no built-in equivalent. The iOS side is
// ios/Cartell/PackageInfoModule.m; both are called through src/services/packageInfo.ts.
class PackageInfoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartellPackageInfo"

  @ReactMethod
  fun fromPlatform(promise: Promise) {
    try {
      val manager = reactApplicationContext.packageManager
      val name = reactApplicationContext.packageName
      val info =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            manager.getPackageInfo(name, PackageManager.PackageInfoFlags.of(0))
          } else {
            @Suppress("DEPRECATION") manager.getPackageInfo(name, 0)
          }
      val buildNumber =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.longVersionCode
          } else {
            @Suppress("DEPRECATION") info.versionCode.toLong()
          }
      val result = Arguments.createMap()
      result.putString("version", info.versionName ?: "")
      result.putString("buildNumber", buildNumber.toString())
      promise.resolve(result)
    } catch (error: PackageManager.NameNotFoundException) {
      promise.reject("package_info", error)
    }
  }
}
