package com.iwatllc.cartell

import android.os.Build
import android.view.autofill.AutofillManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Flutter's TextInput.finishAutofillContext on Android: its engine (TextInputPlugin) calls
// AutofillManager.commit() for shouldSave: true, which is what makes the password manager offer
// "Save password?", and AutofillManager.cancel() for false, which throws the context away so
// nothing is offered. React Native has no equivalent (src/services/autofill.ts).
//
// Both are synchronous on purpose: AutofillGroup cancels while its screen is being removed, and
// the cancel has to reach the AutofillManager before the fields disappear, or Android may treat
// the vanishing fields as a finished form and offer to save them anyway.
class AutofillModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartellAutofill"

  private fun manager(): AutofillManager? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    val activity = reactApplicationContext.currentActivity ?: return null
    return activity.getSystemService(AutofillManager::class.java)
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun commit(): Boolean {
    val manager = manager() ?: return false
    manager.commit()
    return true
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun cancel(): Boolean {
    val manager = manager() ?: return false
    manager.cancel()
    return true
  }
}
