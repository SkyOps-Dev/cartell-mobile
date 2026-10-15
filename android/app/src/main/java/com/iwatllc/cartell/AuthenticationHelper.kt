package com.iwatllc.cartell

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.app.Application
import android.content.DialogInterface
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.ContextThemeWrapper
import android.view.LayoutInflater
import android.widget.TextView
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.ReadableMap
import java.util.concurrent.Executor

// Port of local_auth_android 1.0.56's AuthenticationHelper.java: one BiometricPrompt request and
// its outcome, as Flutter's local_auth runs it. Kept as written, including its sticky behaviour
// (a prompt the system cancels while the app is in the background is shown again when the app
// comes back) and its "go to settings" dialog when nothing is set up.
internal class AuthenticationHelper(
    private val lifecycle: Lifecycle?,
    private val activity: FragmentActivity,
    options: Options,
    private val strings: Strings,
    private val completionHandler: (AuthResult) -> Unit,
    allowCredentials: Boolean,
) : BiometricPrompt.AuthenticationCallback(),
    Application.ActivityLifecycleCallbacks,
    DefaultLifecycleObserver {

  /** Messages.AuthResult; `jsName` is what src/services/localAuth.ts receives. */
  enum class AuthResult(val jsName: String) {
    SUCCESS("success"),
    FAILURE("failure"),
    ERROR_ALREADY_IN_PROGRESS("errorAlreadyInProgress"),
    ERROR_NO_ACTIVITY("errorNoActivity"),
    ERROR_NOT_FRAGMENT_ACTIVITY("errorNotFragmentActivity"),
    ERROR_NOT_AVAILABLE("errorNotAvailable"),
    ERROR_NOT_ENROLLED("errorNotEnrolled"),
    ERROR_LOCKED_OUT_TEMPORARILY("errorLockedOutTemporarily"),
    ERROR_LOCKED_OUT_PERMANENTLY("errorLockedOutPermanently"),
  }

  /** Messages.AuthOptions. */
  data class Options(
      val biometricOnly: Boolean,
      val sensitiveTransaction: Boolean,
      val sticky: Boolean,
      val useErrorDialogs: Boolean,
  )

  /** Messages.AuthStrings (biometricNotRecognized is sent but never read, as in the plugin). */
  data class Strings(
      val reason: String,
      val biometricHint: String,
      val biometricRequiredTitle: String,
      val cancelButton: String,
      val deviceCredentialsRequiredTitle: String,
      val deviceCredentialsSetupDescription: String,
      val goToSettingsButton: String,
      val goToSettingsDescription: String,
      val signInTitle: String,
  ) {
    companion object {
      fun from(map: ReadableMap) =
          Strings(
              reason = map.getString("reason") ?: "",
              biometricHint = map.getString("biometricHint") ?: "",
              biometricRequiredTitle = map.getString("biometricRequiredTitle") ?: "",
              cancelButton = map.getString("cancelButton") ?: "",
              deviceCredentialsRequiredTitle =
                  map.getString("deviceCredentialsRequiredTitle") ?: "",
              deviceCredentialsSetupDescription =
                  map.getString("deviceCredentialsSetupDescription") ?: "",
              goToSettingsButton = map.getString("goToSettingsButton") ?: "",
              goToSettingsDescription = map.getString("goToSettingsDescription") ?: "",
              signInTitle = map.getString("signInTitle") ?: "",
          )
    }
  }

  private val useErrorDialogs = options.useErrorDialogs
  private val isAuthSticky = options.sticky
  private val uiThreadExecutor = UiThreadExecutor()
  private val promptInfo: BiometricPrompt.PromptInfo
  private var activityPaused = false
  private var biometricPrompt: BiometricPrompt? = null

  init {
    val promptBuilder =
        BiometricPrompt.PromptInfo.Builder()
            .setDescription(strings.reason)
            .setTitle(strings.signInTitle)
            .setSubtitle(strings.biometricHint)
            .setConfirmationRequired(options.sensitiveTransaction)
    var allowedAuthenticators =
        BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.BIOMETRIC_STRONG
    if (allowCredentials) {
      allowedAuthenticators =
          allowedAuthenticators or BiometricManager.Authenticators.DEVICE_CREDENTIAL
    } else {
      promptBuilder.setNegativeButtonText(strings.cancelButton)
    }
    promptBuilder.setAllowedAuthenticators(allowedAuthenticators)
    promptInfo = promptBuilder.build()
  }

  /** Starts the auth process. */
  fun authenticate() {
    if (lifecycle != null) {
      lifecycle.addObserver(this)
    } else {
      activity.application.registerActivityLifecycleCallbacks(this)
    }
    biometricPrompt = BiometricPrompt(activity, uiThreadExecutor, this).also {
      it.authenticate(promptInfo)
    }
  }

  /** Cancels the biometric authentication. */
  fun stopAuthentication() {
    biometricPrompt?.cancelAuthentication()
    biometricPrompt = null
  }

  /** Stops the biometric listener. */
  private fun stop() {
    if (lifecycle != null) {
      lifecycle.removeObserver(this)
      return
    }
    activity.application.unregisterActivityLifecycleCallbacks(this)
  }

  @SuppressLint("SwitchIntDef")
  override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
    when (errorCode) {
      BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> {
        if (useErrorDialogs) {
          showGoToSettingsDialog(
              strings.deviceCredentialsRequiredTitle, strings.deviceCredentialsSetupDescription)
          return
        }
        completionHandler(AuthResult.ERROR_NOT_AVAILABLE)
      }
      BiometricPrompt.ERROR_NO_SPACE,
      BiometricPrompt.ERROR_NO_BIOMETRICS -> {
        if (useErrorDialogs) {
          showGoToSettingsDialog(strings.biometricRequiredTitle, strings.goToSettingsDescription)
          return
        }
        completionHandler(AuthResult.ERROR_NOT_ENROLLED)
      }
      BiometricPrompt.ERROR_HW_UNAVAILABLE,
      BiometricPrompt.ERROR_HW_NOT_PRESENT -> completionHandler(AuthResult.ERROR_NOT_AVAILABLE)
      BiometricPrompt.ERROR_LOCKOUT -> completionHandler(AuthResult.ERROR_LOCKED_OUT_TEMPORARILY)
      BiometricPrompt.ERROR_LOCKOUT_PERMANENT ->
          completionHandler(AuthResult.ERROR_LOCKED_OUT_PERMANENTLY)
      BiometricPrompt.ERROR_CANCELED -> {
        // If we are doing sticky auth and the activity has been paused, ignore this error. We
        // will start listening again when resumed.
        if (activityPaused && isAuthSticky) {
          return
        } else {
          completionHandler(AuthResult.FAILURE)
        }
      }
      else -> completionHandler(AuthResult.FAILURE)
    }
    stop()
  }

  override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
    completionHandler(AuthResult.SUCCESS)
    stop()
  }

  override fun onAuthenticationFailed() {}

  // If the activity is paused, we keep track because the biometric dialog simply returns "User
  // cancelled" when the activity is paused.
  override fun onActivityPaused(ignored: Activity) {
    if (isAuthSticky) {
      activityPaused = true
    }
  }

  override fun onActivityResumed(ignored: Activity) {
    if (isAuthSticky) {
      activityPaused = false
      val prompt = BiometricPrompt(activity, uiThreadExecutor, this)
      // When the app is resumed, the prompt is started again.
      uiThreadExecutor.handler.post { prompt.authenticate(promptInfo) }
    }
  }

  // The plugin calls the two callbacks above with a null activity; nothing reads it.
  override fun onPause(owner: LifecycleOwner) = onActivityPaused(activity)

  override fun onResume(owner: LifecycleOwner) = onActivityResumed(activity)

  // Suppress inflateParams lint because dialogs do not need to attach to a parent view.
  @SuppressLint("InflateParams")
  private fun showGoToSettingsDialog(title: String, descriptionText: String) {
    val view = LayoutInflater.from(activity).inflate(R.layout.local_auth_go_to_setting, null, false)
    view.findViewById<TextView>(R.id.local_auth_fingerprint_required).text = title
    view.findViewById<TextView>(R.id.local_auth_go_to_setting_description).text = descriptionText
    val context = ContextThemeWrapper(activity, R.style.LocalAuthAlertDialogCustom)
    val goToSettingHandler =
        DialogInterface.OnClickListener { _, _ ->
          completionHandler(AuthResult.FAILURE)
          stop()
          activity.startActivity(Intent(Settings.ACTION_SECURITY_SETTINGS))
        }
    val cancelHandler =
        DialogInterface.OnClickListener { _, _ ->
          completionHandler(AuthResult.FAILURE)
          stop()
        }
    AlertDialog.Builder(context)
        .setView(view)
        .setPositiveButton(strings.goToSettingsButton, goToSettingHandler)
        .setNegativeButton(strings.cancelButton, cancelHandler)
        .setCancelable(false)
        .show()
  }

  override fun onActivityCreated(activity: Activity, bundle: Bundle?) {}

  override fun onActivityStarted(activity: Activity) {}

  override fun onActivityStopped(activity: Activity) {}

  override fun onActivitySaveInstanceState(activity: Activity, bundle: Bundle) {}

  override fun onActivityDestroyed(activity: Activity) {}

  override fun onDestroy(owner: LifecycleOwner) {}

  override fun onStop(owner: LifecycleOwner) {}

  override fun onStart(owner: LifecycleOwner) {}

  override fun onCreate(owner: LifecycleOwner) {}

  internal class UiThreadExecutor : Executor {
    val handler = Handler(Looper.getMainLooper())

    override fun execute(command: Runnable) {
      handler.post(command)
    }
  }
}
