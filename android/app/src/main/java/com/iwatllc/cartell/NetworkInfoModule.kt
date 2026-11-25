package com.iwatllc.cartell

import android.content.Context
import android.net.wifi.WifiManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Port of network_info_plus 6.1.4's Android getWifiName (network_info/NetworkInfo.kt): the SSID
// of the current Wi-Fi connection as Android reports it, in double quotes when it is a UTF-8 name,
// and "<unknown ssid>" when the app may not read it (no location permission, or location off).
// Called through src/services/networkInfo.ts; the iOS side is ios/Cartell/NetworkInfoModule.m.
class NetworkInfoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val wifiManager =
      reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

  override fun getName(): String = "CartellNetworkInfo"

  @Suppress("DEPRECATION")
  @ReactMethod
  fun getWifiName(promise: Promise) {
    promise.resolve(wifiManager.connectionInfo.ssid)
  }
}
