// Port of network_info_plus 6.1.4's iOS getWifiName (FPPHotspotNetworkInfoProvider.m, the iOS 14+
// provider; the app's minimum is iOS 15.5): the current Wi-Fi network's SSID from
// NEHotspotNetwork, or nil. iOS answers only with the Access Wi-Fi Information entitlement
// (Cartell.entitlements has it) and location permission. The Android side is
// android/.../NetworkInfoModule.kt; both are called through src/services/networkInfo.ts.

#import <Foundation/Foundation.h>
#import <NetworkExtension/NetworkExtension.h>
#import <React/RCTBridgeModule.h>

@interface CartellNetworkInfo : NSObject <RCTBridgeModule>
@end

@implementation CartellNetworkInfo

RCT_EXPORT_MODULE(CartellNetworkInfo)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(getWifiName
                  : (RCTPromiseResolveBlock)resolve reject
                  : (__unused RCTPromiseRejectBlock)reject)
{
  [NEHotspotNetwork fetchCurrentWithCompletionHandler:^(NEHotspotNetwork *_Nullable network) {
    dispatch_async(dispatch_get_main_queue(), ^{
      resolve(network.SSID);
    });
  }];
}

@end
