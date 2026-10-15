package com.iwatllc.cartell

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

// ReactActivity extends AppCompatActivity, which is a FragmentActivity, so the biometric prompt
// has the host it needs (the Flutter app uses FlutterFragmentActivity for the same reason).
class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Cartell"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // Same order as FlutterFragmentActivity.onCreate: switch LaunchTheme → NormalTheme first.
    setTheme(R.style.NormalTheme)
    super.onCreate(savedInstanceState)
    restoreThemeNavigationBar()
    delayFirstDrawUntilReactRenders()
  }

  // React Native's edge-to-edge setup (WindowUtil.enableEdgeToEdge, run inside super.onCreate)
  // sets the navigation bar colour to transparent and makes the bar "light" in light mode, so
  // Android paints its own contrast strip behind 3-button navigation. Flutter never touches either
  // and keeps the theme's values: black, which Android 15+ draws at 80% over the app. Measured on
  // the RMX5070 (2026-10-13): Flutter's strip is (2, 3, 7), i.e. black at 0.8 over #0A0E21; RN's
  // was (17, 21, 36). Put the theme's values back.
  private fun restoreThemeNavigationBar() {
    val attributes =
        theme.obtainStyledAttributes(
            intArrayOf(
                android.R.attr.navigationBarColor,
                android.R.attr.windowLightNavigationBar,
            ))
    try {
      @Suppress("DEPRECATION")
      window.navigationBarColor = attributes.getColor(0, Color.BLACK)
      WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars =
          attributes.getBoolean(1, false)
    } finally {
      attributes.recycle()
    }
  }

  // FlutterFragmentActivity (opaque, surface render mode) cancels every Android draw until the
  // first Flutter frame, so the launch splash stays up until the app has real content. Do the
  // same: cancel draws until the React root view has mounted a child.
  private fun delayFirstDrawUntilReactRenders() {
    val content = findViewById<View>(android.R.id.content)
    content.viewTreeObserver.addOnPreDrawListener(
        object : ViewTreeObserver.OnPreDrawListener {
          override fun onPreDraw(): Boolean {
            val rootView = (content as? ViewGroup)?.getChildAt(0) as? ViewGroup
            if (rootView == null || rootView.childCount == 0) return false
            content.viewTreeObserver.removeOnPreDrawListener(this)
            return true
          }
        })
  }
}
