// Port of Flutter's PackageInfo.fromPlatform() on iOS (package_info_plus FPPPackageInfoPlusPlugin):
// the main bundle's CFBundleShortVersionString and CFBundleVersion, or "" when missing. The
// Android side is android/.../PackageInfoModule.kt; both are called through
// src/services/packageInfo.ts.

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface CartellPackageInfo : NSObject <RCTBridgeModule>
@end

@implementation CartellPackageInfo

RCT_EXPORT_MODULE(CartellPackageInfo)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(fromPlatform
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  NSDictionary *info = [[NSBundle mainBundle] infoDictionary];
  NSString *version = info[@"CFBundleShortVersionString"] ?: @"";
  NSString *buildNumber = info[@"CFBundleVersion"] ?: @"";
  resolve(@{@"version" : version, @"buildNumber" : buildNumber});
}

@end
