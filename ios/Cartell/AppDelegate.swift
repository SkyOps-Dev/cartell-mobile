import UIKit
import FirebaseCore
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Firebase starts from GoogleService-Info.plist before anything else, as Flutter's
    // Firebase.initializeApp() does at its start-up (frontend/lib/utilities/notifications.dart);
    // @react-native-firebase needs it done natively. Spec 09 §2.
    FirebaseApp.configure()

    // iOS asks this object whether to show an alert while the app is open, as Flutter's
    // AppDelegate sets it (frontend/ios/Runner/AppDelegate.swift). It has to be set while the app
    // is launching: @react-native-firebase/messaging puts its own handler in front once launching
    // has finished, and passes every question on to this one. Spec 09 §2–3.
    UNUserNotificationCenter.current().delegate = self

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Cartell",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // While the app is open. Flutter's answers (flutter_local_notifications 18.0.1 and
  // firebase_messaging 15.2.10): the app's own alert (ios/Cartell/NotificationsModule.m marks it)
  // shows as a banner and in the list, with its sound and badge (the plugin's defaults; iOS 14+
  // uses banner and list in place of alert); a push from Firebase shows nothing, because the app
  // draws its own copy of it.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if notification.request.content.userInfo["cartellLocalNotification"] != nil {
      completionHandler([.banner, .list, .sound, .badge])
    } else {
      completionHandler([])
    }
  }

  // A tap on any alert: the app opens as it normally does. Flutter registers no tap handler.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  // The Flutter app shows the #0A0E21 launch screen until its first frame. React Native's root
  // view is otherwise the system background (white in light mode), which would flash between the
  // launch screen and the first React frame.
  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    rootView.backgroundColor = UIColor(red: 0x0A / 255.0, green: 0x0E / 255.0, blue: 0x21 / 255.0, alpha: 1)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
