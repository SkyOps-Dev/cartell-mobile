package com.iwatllc.cartell

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.SupplicantState
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Port of wifi_iot 0.3.19+2's Android plugin (com/alternadom/wifiiot/WifiIotPlugin.java) for the
// calls hub pairing makes: connect, forceWifiUsage, disconnect, isConnected, isEnabled and
// setEnabled. The hub's own network is joined local-only (no internet), so of connect's branches
// only the two that call reaches are ported: on Android 10+ a WifiNetworkSpecifier request, which
// raises the system's "Connect to device" prompt; before Android 10 the deprecated saved-network
// join. connect's suggestion branch (withInternet), BSSID and hidden-network options are never
// used by the app. The plugin's state is kept as it keeps it: the joined network, which
// forceWifiUsage binds the app to, and the request callback, which disconnect releases.
// Called through src/services/wifiIot.ts; the iOS side is ios/Cartell/WifiIotModule.m.
class WifiIotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val wifiManager =
      reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
  private var joinedNetwork: Network? = null
  private var networkCallback: ConnectivityManager.NetworkCallback? = null
  private val ssidsToBeRemovedOnExit = mutableListOf<String>()

  override fun getName(): String = "CartellWifiIot"

  private val connectivityManager: ConnectivityManager
    get() =
        reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE)
            as ConnectivityManager

  // The plugin's cleanup() when its engine detaches: saved networks joined "once" before
  // Android 10 are removed again. It leaves the network request alone, as here.
  @Suppress("DEPRECATION")
  override fun invalidate() {
    if (ssidsToBeRemovedOnExit.isNotEmpty()) {
      val configured = wifiManager.configuredNetworks ?: emptyList()
      for (ssid in ssidsToBeRemovedOnExit) {
        for (config in configured) {
          if (config.SSID == ssid) {
            wifiManager.removeNetwork(config.networkId)
          }
        }
      }
    }
    super.invalidate()
  }

  @ReactMethod
  fun isEnabled(promise: Promise) {
    promise.resolve(wifiManager.isWifiEnabled)
  }

  // Before Android 10 this switches Wi-Fi on. From Android 10 an app may not, and the call does
  // nothing (the app always passes shouldOpenSettings = false).
  @Suppress("DEPRECATION")
  @ReactMethod
  fun setEnabled(state: Boolean, shouldOpenSettings: Boolean, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      wifiManager.setWifiEnabled(state)
    } else if (shouldOpenSettings) {
      val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
      reactApplicationContext.startActivity(intent)
    } else {
      wifiManager.setWifiEnabled(state)
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun connect(
      ssid: String,
      password: String?,
      security: String?,
      joinOnce: Boolean,
      timeoutInSeconds: Double,
      promise: Promise
  ) {
    Thread { connectTo(promise, ssid, password, security, joinOnce, timeoutInSeconds.toInt()) }
        .start()
  }

  private fun connectTo(
      promise: Promise,
      ssid: String,
      password: String?,
      security: String?,
      joinOnce: Boolean,
      timeoutInSeconds: Int
  ) {
    val handler = Handler(Looper.getMainLooper())
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      val connected = connectToDeprecated(ssid, password, security, joinOnce)
      handler.post { promise.resolve(connected) }
      return
    }

    if (security != null && security.uppercase() == "WEP") {
      handler.post {
        promise.reject("Error", "WEP is not supported for Android SDK ${Build.VERSION.SDK_INT}")
      }
      return
    }

    val builder = WifiNetworkSpecifier.Builder()
    builder.setSsid(ssid)
    builder.setIsHiddenSsid(false)
    if (security != null && security.uppercase() == "WPA") {
      builder.setWpa2Passphrase(password ?: "")
    }

    val networkRequest =
        NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .setNetworkSpecifier(builder.build())
            .build()

    val manager = connectivityManager
    networkCallback?.let { manager.unregisterNetworkCallback(it) }

    val callback =
        object : ConnectivityManager.NetworkCallback() {
          var resultSent = false

          override fun onAvailable(network: Network) {
            super.onAvailable(network)
            if (!resultSent) {
              joinedNetwork = network
              promise.resolve(true)
              resultSent = true
            }
          }

          override fun onUnavailable() {
            super.onUnavailable()
            if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
              manager.unregisterNetworkCallback(this)
            }
            if (!resultSent) {
              promise.resolve(false)
              resultSent = true
            }
          }

          override fun onLost(network: Network) {
            super.onLost(network)
            if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
              manager.unregisterNetworkCallback(this)
            }
          }
        }
    networkCallback = callback
    manager.requestNetwork(networkRequest, callback, handler, timeoutInSeconds * 1000)
  }

  @Suppress("DEPRECATION")
  private fun connectToDeprecated(
      ssid: String,
      password: String?,
      security: String?,
      joinOnce: Boolean
  ): Boolean {
    val conf = generateConfiguration(ssid, password, security)
    val updateNetwork = registerWifiNetworkDeprecated(conf)
    if (updateNetwork == -1) {
      return false
    }
    if (joinOnce) {
      ssidsToBeRemovedOnExit.add(conf.SSID)
    }
    if (!wifiManager.disconnect()) {
      return false
    }
    if (!wifiManager.enableNetwork(updateNetwork, true)) {
      return false
    }

    var connected = false
    for (i in 0 until 20) {
      val currentNet = wifiManager.connectionInfo
      val networkId = currentNet.networkId
      val netState = currentNet.supplicantState
      // Wait for the connection to complete, to discard false positives like an auth error.
      if (networkId != -1 && netState == SupplicantState.COMPLETED) {
        connected = networkId == updateNetwork
        break
      }
      try {
        Thread.sleep(500)
      } catch (ignored: InterruptedException) {
        break
      }
    }
    return connected
  }

  @Suppress("DEPRECATION")
  private fun registerWifiNetworkDeprecated(conf: WifiConfiguration): Int {
    var updateNetwork = -1
    var registeredNetwork = -1

    // Replace any existing configuration for this network.
    val configured = wifiManager.configuredNetworks
    if (configured != null) {
      for (wifiConfig in configured) {
        if (wifiConfig.SSID == conf.SSID &&
            (wifiConfig.BSSID == null || conf.BSSID == null || wifiConfig.BSSID == conf.BSSID)) {
          conf.networkId = wifiConfig.networkId
          registeredNetwork = wifiConfig.networkId
          updateNetwork = wifiManager.updateNetwork(conf)
        }
      }
    }

    // Not configured yet: add it.
    if (updateNetwork == -1) {
      updateNetwork = wifiManager.addNetwork(conf)
      wifiManager.saveConfiguration()
    }

    // Fall back to the last known valid network id.
    if (updateNetwork == -1) {
      return registeredNetwork
    }
    return updateNetwork
  }

  @Suppress("DEPRECATION")
  private fun generateConfiguration(
      ssid: String,
      password: String?,
      securityIn: String?
  ): WifiConfiguration {
    val conf = WifiConfiguration()
    conf.SSID = "\"" + ssid + "\""
    conf.hiddenSSID = false

    val security = securityIn?.uppercase() ?: "NONE"
    when (security) {
      "WPA" -> {
        conf.preSharedKey = "\"" + password + "\""
        conf.allowedProtocols.set(WifiConfiguration.Protocol.RSN)
        conf.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK)
        conf.status = WifiConfiguration.Status.ENABLED
        conf.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.TKIP)
        conf.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.CCMP)
        conf.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK)
        conf.allowedPairwiseCiphers.set(WifiConfiguration.PairwiseCipher.TKIP)
        conf.allowedPairwiseCiphers.set(WifiConfiguration.PairwiseCipher.CCMP)
        conf.allowedProtocols.set(WifiConfiguration.Protocol.RSN)
        conf.allowedProtocols.set(WifiConfiguration.Protocol.WPA)
      }
      "WEP" -> {
        conf.wepKeys[0] = "\"" + password + "\""
        conf.wepTxKeyIndex = 0
        conf.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
        conf.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.WEP40)
      }
      else -> conf.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
    }
    return conf
  }

  // Binds the app's traffic to the joined network (Android 12 runs one Wi-Fi connection beside
  // another, so the joined one must be named), or, with none joined, to the first Wi-Fi network
  // the system offers. false unbinds.
  @ReactMethod
  fun forceWifiUsage(useWifi: Boolean, promise: Promise) {
    val manager = connectivityManager
    if (!useWifi) {
      promise.resolve(manager.bindProcessToNetwork(null))
      return
    }
    val joined = joinedNetwork
    if (joined != null) {
      promise.resolve(manager.bindProcessToNetwork(joined))
      return
    }
    val request =
        NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()
    manager.requestNetwork(
        request,
        object : ConnectivityManager.NetworkCallback() {
          override fun onAvailable(network: Network) {
            super.onAvailable(network)
            manager.unregisterNetworkCallback(this)
            val result = manager.bindProcessToNetwork(network)
            Handler(Looper.getMainLooper()).post { promise.resolve(result) }
          }
        })
  }

  // Any network with Wi-Fi transport counts, internet or not. The plugin first asks for
  // ACCESS_NETWORK_STATE if it is missing; it is a normal permission the manifest declares, so it
  // is always granted.
  @Suppress("DEPRECATION")
  @ReactMethod
  fun isConnected(promise: Promise) {
    var result = false
    for (network in connectivityManager.allNetworks) {
      val capabilities = connectivityManager.getNetworkCapabilities(network)
      if (capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
        result = true
        break
      }
    }
    promise.resolve(result)
  }

  // Android 10+: releases the network request, which makes the system leave the hub's network.
  @Suppress("DEPRECATION")
  @ReactMethod
  fun disconnect(promise: Promise) {
    var disconnected = false
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      disconnected = wifiManager.disconnect()
    } else {
      val callback = networkCallback
      if (callback != null) {
        connectivityManager.unregisterNetworkCallback(callback)
        networkCallback = null
        disconnected = true
        joinedNetwork = null
      } else {
        Log.e(
            "WifiIotPlugin",
            "Can't disconnect from WiFi, networkCallback and networkSuggestions is null.")
      }
    }
    promise.resolve(disconnected)
  }
}
