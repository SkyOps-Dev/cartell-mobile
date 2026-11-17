package com.iwatllc.cartell

import android.content.Context
import android.location.LocationManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Flutter's Geolocator.isLocationServiceEnabled() on Android (geolocator_android 4.6.2,
// location/LocationClient.java): location is on when the GPS or the network provider is enabled.
// (With Google Play services geolocator asks the settings client whether GPS or network location
// is usable, which reads the same switches.) The rest of Detect Location (permission, the fix)
// comes from @react-native-community/geolocation. The iOS side is ios/Cartell/GeolocatorModule.m;
// both are called through src/services/geolocator.ts.
class GeolocatorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartellGeolocator"

  @ReactMethod
  fun isLocationServiceEnabled(promise: Promise) {
    val manager =
        reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager?
    if (manager == null) {
      promise.resolve(false)
      return
    }
    val gpsEnabled = manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
    val networkEnabled = manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    promise.resolve(gpsEnabled || networkEnabled)
  }
}
