package com.iwatllc.cartell

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Port of the app's in-app alert (frontend/lib/services/notifications.dart, NotificationApi) as
// flutter_local_notifications 18.0.1 draws it on Android (FlutterLocalNotificationsPlugin.java:
// createNotification, setupNotificationChannel, showNotification), with every value the app's
// AndroidNotificationDetails('?', 'Miscellaneous', importance: max, playSound: true) and the
// plugin's defaults send. Spec 09 §3. The permission request (permission_handler) is in
// src/services/notifications.ts; the iOS side is ios/Cartell/NotificationsModule.m.
class NotificationsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CartellNotifications"

  // initialize(InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher'),
  // …)): on Android the plugin only checks the icon exists and stores its name for later alerts,
  // then answers true. The icon is fixed here (R.mipmap.ic_launcher), so nothing is stored.
  @ReactMethod
  fun initialize(promise: Promise) {
    promise.resolve(true)
  }

  // show(id, title, body, details): the channel first (only if it does not exist yet:
  // AndroidNotificationChannelAction.createIfNotExists), then the alert, posted under its id with
  // no tag, so the app's id 0 replaces the previous alert. Without the notification permission
  // Android drops it silently, as it does Flutter's.
  @ReactMethod
  fun show(id: Double, title: String?, body: String?, promise: Promise) {
    try {
      val context = reactApplicationContext
      val notificationId = id.toInt()
      createChannelIfNotExists(context)
      NotificationManagerCompat.from(context).notify(notificationId, build(context, notificationId, title, body))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("show_failed", e.message, e)
    }
  }

  private fun createChannelIfNotExists(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, IMPORTANCE_MAX)
    channel.description = null // channelDescription
    channel.group = null // no channel group
    // playSound: true, no sound of its own: the phone's default notification sound, played as a
    // notification (AudioAttributesUsage.notification).
    channel.setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build())
    channel.enableVibration(true) // enableVibration: true, no pattern
    channel.enableLights(false) // enableLights: false
    channel.setShowBadge(true) // channelShowBadge: true
    manager.createNotificationChannel(channel)
  }

  private fun build(
      context: Context,
      id: Int,
      title: String?,
      body: String?,
  ): android.app.Notification {
    // Tapping opens the app as its launcher does. The plugin marks the intent as its own
    // (action SELECT_NOTIFICATION, the id, a null payload); the app registers no tap handler, so
    // nothing else happens.
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)!!
    intent.action = "SELECT_NOTIFICATION"
    intent.putExtra("notificationId", id)
    intent.putExtra("payload", null as String?)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val pendingIntent = PendingIntent.getActivity(context, id, intent, flags)

    val builder =
        NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setTicker(null)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOngoing(false)
            .setSilent(false)
            .setOnlyAlertOnce(false)
            // AndroidInitializationSettings('@mipmap/ic_launcher'): the app's launcher icon.
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(null as android.graphics.Bitmap?)
            // No colour; colorized, showWhen, usesChronometer and chronometerCountDown are sent
            // with their defaults and set.
            .setColorized(false)
            .setShowWhen(true)
            .setUsesChronometer(false)
            // playSound: true with no sound of its own (vibration: on, no pattern, so none set).
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      builder.setChronometerCountDown(false)
    }
    // No visibility, group, lights, style, progress, category or time-out: all unset in the app.
    return builder.build()
  }

  companion object {
    const val CHANNEL_ID = "?"
    const val CHANNEL_NAME = "Miscellaneous"
    // Importance.max (5), as the plugin passes it to NotificationChannel.
    const val IMPORTANCE_MAX = NotificationManager.IMPORTANCE_MAX
  }
}
