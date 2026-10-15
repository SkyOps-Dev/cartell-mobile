package com.iwatllc.cartell

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import androidx.biometric.BiometricManager
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import java.util.concurrent.atomic.AtomicBoolean

// Port of local_auth_android 1.0.56's LocalAuthPlugin.java, the native half of Flutter's
// local_auth on Android, for the three calls the app makes: isDeviceSupported,
// getEnrolledBiometrics and authenticate. The prompt itself is AuthenticationHelper.kt. The iOS
// side is ios/Cartell/LocalAuthModule.m; both are called through src/services/localAuth.ts.
//
// Left out, because the app never calls them: deviceCanSupportBiometrics, stopAuthentication, and
// the plugin's activity-result listener (nothing in the plugin starts that activity).
class LocalAuthModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartellLocalAuth"

  private val authInProgress = AtomicBoolean(false)
  private var authHelper: AuthenticationHelper? = null

  // The plugin reads both from the activity it is attached to.
  private fun biometricManager(): BiometricManager? =
      reactApplicationContext.currentActivity?.let { BiometricManager.from(it) }

  private fun keyguardManager(): KeyguardManager? =
      reactApplicationContext.currentActivity
          ?.baseContext
          ?.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager

  @ReactMethod
  fun isDeviceSupported(promise: Promise) {
    promise.resolve(isDeviceSupportedNow())
  }

  @ReactMethod
  fun getEnrolledBiometrics(promise: Promise) {
    val biometrics = Arguments.createArray()
    val manager = biometricManager()
    if (manager != null) {
      if (manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
          BiometricManager.BIOMETRIC_SUCCESS) {
        biometrics.pushString("weak")
      }
      if (manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
          BiometricManager.BIOMETRIC_SUCCESS) {
        biometrics.pushString("strong")
      }
    }
    promise.resolve(biometrics)
  }

  /** Resolves with one of AuthResult's names (see AuthenticationHelper.AuthResult). */
  @ReactMethod
  fun authenticate(options: ReadableMap, strings: ReadableMap, promise: Promise) {
    // Flutter answers on the platform (main) thread; the prompt and the lifecycle need it too.
    UiThreadUtil.runOnUiThread {
      val result = Result(promise)
      if (authInProgress.get()) {
        result.success(AuthenticationHelper.AuthResult.ERROR_ALREADY_IN_PROGRESS)
        return@runOnUiThread
      }
      val activity = reactApplicationContext.currentActivity
      if (activity == null || activity.isFinishing) {
        result.success(AuthenticationHelper.AuthResult.ERROR_NO_ACTIVITY)
        return@runOnUiThread
      }
      if (activity !is FragmentActivity) {
        result.success(AuthenticationHelper.AuthResult.ERROR_NOT_FRAGMENT_ACTIVITY)
        return@runOnUiThread
      }
      if (!isDeviceSupportedNow()) {
        result.success(AuthenticationHelper.AuthResult.ERROR_NOT_AVAILABLE)
        return@runOnUiThread
      }
      authInProgress.set(true)
      val allowCredentials =
          !options.getBoolean("biometricOnly") && canAuthenticateWithDeviceCredential()
      authHelper =
          AuthenticationHelper(
                  activity.lifecycle,
                  activity,
                  AuthenticationHelper.Options(
                      biometricOnly = options.getBoolean("biometricOnly"),
                      sensitiveTransaction = options.getBoolean("sensitiveTransaction"),
                      sticky = options.getBoolean("sticky"),
                      useErrorDialogs = options.getBoolean("useErrorDialogs"),
                  ),
                  AuthenticationHelper.Strings.from(strings),
                  { value -> onAuthenticationCompleted(result, value) },
                  allowCredentials,
              )
              .also { it.authenticate() }
    }
  }

  private fun onAuthenticationCompleted(
      result: Result,
      value: AuthenticationHelper.AuthResult,
  ) {
    if (authInProgress.compareAndSet(true, false)) {
      result.success(value)
    }
  }

  private fun isDeviceSupportedNow(): Boolean = isDeviceSecure() || canAuthenticateWithBiometrics()

  private fun isDeviceSecure(): Boolean = keyguardManager()?.isDeviceSecure ?: false

  private fun canAuthenticateWithBiometrics(): Boolean {
    val manager = biometricManager() ?: return false
    return manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
        BiometricManager.BIOMETRIC_SUCCESS
  }

  private fun canAuthenticateWithDeviceCredential(): Boolean {
    if (Build.VERSION.SDK_INT < 30) {
      return isDeviceSecure()
    }
    val manager = biometricManager() ?: return false
    return manager.canAuthenticate(BiometricManager.Authenticators.DEVICE_CREDENTIAL) ==
        BiometricManager.BIOMETRIC_SUCCESS
  }

  /** Pigeon's Result: answered once, with the result's name. */
  private class Result(private val promise: Promise) {
    fun success(value: AuthenticationHelper.AuthResult) {
      promise.resolve(value.jsName)
    }
  }
}
