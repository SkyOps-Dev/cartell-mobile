// Port of geolocator_apple 2.3.13 (GeolocatorPlugin.m, Handlers/PermissionHandler.m,
// Utils/AuthorizationStatusMapper.m) for what Detect Location (a sensor's Edit Coordinates) uses on
// iOS:
// - isLocationServiceEnabled: CLLocationManager's locationServicesEnabled.
// - checkPermission: the authorization status, as geolocator maps it: not determined and
//   restricted → "denied", denied → "deniedForever", when in use → "whileInUse", always →
//   "always".
// - requestPermission: with the status already determined, that status at once (no prompt);
//   otherwise requestWhenInUseAuthorization (Info.plist has NSLocationWhenInUseUsageDescription)
//   and the status the user's answer leads to.
// The fix itself comes from @react-native-community/geolocation, whose own requestAuthorization is
// not used: with the status already denied it never calls back (iOS reports no change).
// The Android side is android/.../GeolocatorModule.kt (permissions there go through
// PermissionsAndroid); both are called through src/services/geolocator.ts.

#import <CoreLocation/CoreLocation.h>
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface CartellGeolocator : NSObject <RCTBridgeModule, CLLocationManagerDelegate>
@property(nonatomic, strong) CLLocationManager *locationManager;
@property(nonatomic, copy) RCTPromiseResolveBlock pendingResolve;
@end

@implementation CartellGeolocator

RCT_EXPORT_MODULE(CartellGeolocator)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

// CLLocationManager calls its delegate on the thread it was made on, which needs a run loop.
- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

static NSString *DartPermission(CLAuthorizationStatus status)
{
  switch (status) {
    case kCLAuthorizationStatusDenied:
      return @"deniedForever";
    case kCLAuthorizationStatusAuthorizedWhenInUse:
      return @"whileInUse";
    case kCLAuthorizationStatusAuthorizedAlways:
      return @"always";
    case kCLAuthorizationStatusNotDetermined:
    case kCLAuthorizationStatusRestricted:
    default:
      return @"denied";
  }
}

static CLAuthorizationStatus CurrentStatus(void)
{
  if (@available(iOS 14, *)) {
    return [[CLLocationManager new] authorizationStatus];
  }
  return [CLLocationManager authorizationStatus];
}

RCT_EXPORT_METHOD(isLocationServiceEnabled
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  resolve(@([CLLocationManager locationServicesEnabled]));
}

RCT_EXPORT_METHOD(checkPermission
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  resolve(DartPermission(CurrentStatus()));
}

RCT_EXPORT_METHOD(requestPermission
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  CLAuthorizationStatus status = [CLLocationManager authorizationStatus];
  if (status != kCLAuthorizationStatusNotDetermined) {
    resolve(DartPermission(status));
    return;
  }
  if (self.pendingResolve != nil) {
    reject(@"PERMISSION_REQUEST_IN_PROGRESS",
           @"A request for location permissions is already running, please wait for it to complete "
           @"before doing another request.",
           nil);
    return;
  }
  self.pendingResolve = resolve;
  self.locationManager = [CLLocationManager new];
  self.locationManager.delegate = self;
  [self.locationManager requestWhenInUseAuthorization];
}

- (void)locationManager:(CLLocationManager *)manager
    didChangeAuthorizationStatus:(CLAuthorizationStatus)status
{
  if (status == kCLAuthorizationStatusNotDetermined) {
    return;
  }
  if (self.pendingResolve != nil) {
    self.pendingResolve(DartPermission(status));
  }
  self.pendingResolve = nil;
  self.locationManager = nil;
}

@end
