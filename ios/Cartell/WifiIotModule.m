// Port of wifi_iot 0.3.19+2's iOS plugin (ios/Classes/SwiftWifiIotPlugin.swift) for the calls hub
// pairing makes:
// - connect: NEHotspotConfigurationManager applies a join-once configuration, which raises the
//   system's "Wants to join Wi-Fi network" alert. Its answer is read as the plugin reads it: an
//   "already associated." error is success; any other error is failure; otherwise success only if
//   the phone's current network is now that SSID.
// - forceWifiUsage: there is nothing to bind on iOS. Asking to use Wi-Fi sends one byte to the
//   discard port on every broadcast-capable interface, which raises the local-network permission
//   alert (iOS 14+) before the hub conversation needs it; the answer is always true.
// - disconnect: removes the hotspot configuration of the network the phone is on, if any.
// - isConnected / isEnabled: whether the phone has a current Wi-Fi network (isEnabled answers nil
//   rather than false, which the JS side reads as false, as Dart does).
// The app's minimum is iOS 15.5, so the plugin's pre-iOS 14 branches are left out. The Android side
// is android/.../WifiIotModule.kt; both are called through src/services/wifiIot.ts.

#import <Foundation/Foundation.h>
#import <NetworkExtension/NetworkExtension.h>
#import <React/RCTBridgeModule.h>

#include <ifaddrs.h>
#include <net/if.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

@interface CartellWifiIot : NSObject <RCTBridgeModule>
@end

@implementation CartellWifiIot

RCT_EXPORT_MODULE(CartellWifiIot)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

static void FetchCurrentSSID(void (^completion)(NSString *_Nullable ssid))
{
  [NEHotspotNetwork fetchCurrentWithCompletionHandler:^(NEHotspotNetwork *_Nullable network) {
    completion(network.SSID);
  }];
}

// The plugin's triggerLocalNetworkPrivacyAlert, after Apple's forum note "Triggering the Local
// Network Privacy Alert".
static void TriggerLocalNetworkPrivacyAlert(void)
{
  int sock4 = socket(AF_INET, SOCK_DGRAM, 0);
  if (sock4 < 0) {
    return;
  }
  int sock6 = socket(AF_INET6, SOCK_DGRAM, 0);
  if (sock6 < 0) {
    close(sock4);
    return;
  }

  struct ifaddrs *addrList = NULL;
  if (getifaddrs(&addrList) == 0) {
    char message = '!';
    for (struct ifaddrs *i = addrList; i != NULL; i = i->ifa_next) {
      if ((i->ifa_flags & IFF_BROADCAST) == 0 || i->ifa_addr == NULL) {
        continue;
      }
      struct sockaddr *sa = i->ifa_addr;
      if (sa->sa_family == AF_INET) {
        struct sockaddr_in sin;
        memcpy(&sin, sa, sizeof(sin));
        sin.sin_port = htons(9);
        sendto(sock4, &message, 1, MSG_DONTWAIT, (struct sockaddr *)&sin, sizeof(sin));
      } else if (sa->sa_family == AF_INET6) {
        struct sockaddr_in6 sin6;
        memcpy(&sin6, sa, sizeof(sin6));
        sin6.sin6_port = htons(9);
        sendto(sock6, &message, 1, MSG_DONTWAIT, (struct sockaddr *)&sin6, sizeof(sin6));
      }
    }
    freeifaddrs(addrList);
  }

  close(sock6);
  close(sock4);
}

RCT_EXPORT_METHOD(connect
                  : (NSString *)ssid password
                  : (nullable NSString *)password security
                  : (nullable NSString *)security joinOnce
                  : (BOOL)joinOnce timeoutInSeconds
                  : (double)timeoutInSeconds resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (__unused RCTPromiseRejectBlock)reject)
{
  NSString *kind = security.uppercaseString;
  NEHotspotConfiguration *configuration;
  if ([kind isEqualToString:@"WPA"]) {
    configuration = [[NEHotspotConfiguration alloc] initWithSSID:ssid
                                                      passphrase:password ?: @""
                                                           isWEP:NO];
  } else if ([kind isEqualToString:@"WEP"]) {
    configuration = [[NEHotspotConfiguration alloc] initWithSSID:ssid
                                                      passphrase:password ?: @""
                                                           isWEP:YES];
  } else {
    configuration = [[NEHotspotConfiguration alloc] initWithSSID:ssid];
  }
  configuration.joinOnce = joinOnce;

  [[NEHotspotConfigurationManager sharedManager]
      applyConfiguration:configuration
       completionHandler:^(NSError *_Nullable error) {
         FetchCurrentSSID(^(NSString *_Nullable connectedSSID) {
           if (error != nil) {
             resolve(@([error.localizedDescription isEqualToString:@"already associated."]));
           } else if (connectedSSID != nil) {
             resolve(@([ssid isEqualToString:connectedSSID]));
           } else {
             resolve(@NO);
           }
         });
       }];
}

RCT_EXPORT_METHOD(forceWifiUsage
                  : (BOOL)useWifi resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (__unused RCTPromiseRejectBlock)reject)
{
  if (useWifi) {
    TriggerLocalNetworkPrivacyAlert();
  }
  resolve(@YES);
}

RCT_EXPORT_METHOD(isEnabled
                  : (RCTPromiseResolveBlock)resolve reject
                  : (__unused RCTPromiseRejectBlock)reject)
{
  FetchCurrentSSID(^(NSString *_Nullable ssid) {
    resolve(ssid != nil ? @YES : nil);
  });
}

RCT_EXPORT_METHOD(isConnected
                  : (RCTPromiseResolveBlock)resolve reject
                  : (__unused RCTPromiseRejectBlock)reject)
{
  FetchCurrentSSID(^(NSString *_Nullable ssid) {
    resolve(@(ssid != nil));
  });
}

RCT_EXPORT_METHOD(disconnect
                  : (RCTPromiseResolveBlock)resolve reject
                  : (__unused RCTPromiseRejectBlock)reject)
{
  FetchCurrentSSID(^(NSString *_Nullable ssid) {
    if (ssid != nil) {
      [[NEHotspotConfigurationManager sharedManager] removeConfigurationForSSID:ssid];
      resolve(@YES);
    } else {
      resolve(@NO);
    }
  });
}

@end
