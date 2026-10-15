// Port of local_auth_darwin 1.6.1's LocalAuthPlugin.swift (iOS), the native half of Flutter's
// local_auth on iPhone, for the three calls the app makes: isDeviceSupported,
// getEnrolledBiometrics and authenticate. The Android side is android/.../LocalAuthModule.kt;
// both are called through src/services/localAuth.ts.
//
// Kept as written: the passcode is allowed unless biometricOnly; sticky auth re-runs a prompt the
// system cancelled (the app went to the background) when the app becomes active again; with
// useErrorDialogs, "not enrolled" / "no passcode" show a "go to settings" alert and a lockout
// shows the lockout alert, both ending as a plain failure.
//
// Results are AuthResultDetails: { result, errorMessage, errorDetails }, `result` being one of
// AuthResult's names.

#import <LocalAuthentication/LocalAuthentication.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface CartellLocalAuth : NSObject <RCTBridgeModule>
@end

@implementation CartellLocalAuth {
  // StickyAuthState: the call to repeat when the app becomes active again.
  NSDictionary *_lastOptions;
  NSDictionary *_lastStrings;
  RCTPromiseResolveBlock _lastCompletion;
}

RCT_EXPORT_MODULE(CartellLocalAuth)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (instancetype)init
{
  if (self = [super init]) {
    // registrar.addApplicationDelegate(instance): only applicationDidBecomeActive is used.
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(applicationDidBecomeActive:)
                                                 name:UIApplicationDidBecomeActiveNotification
                                               object:nil];
  }
  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

static NSDictionary *Details(NSString *result, NSString *errorMessage, NSString *errorDetails)
{
  NSMutableDictionary *details = [NSMutableDictionary dictionaryWithObject:result forKey:@"result"];
  if (errorMessage != nil) {
    details[@"errorMessage"] = errorMessage;
  }
  if (errorDetails != nil) {
    details[@"errorDetails"] = errorDetails;
  }
  return details;
}

static NSString *StringOrNil(id value)
{
  return [value isKindOfClass:[NSString class]] ? value : nil;
}

RCT_EXPORT_METHOD(isDeviceSupported
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  LAContext *context = [[LAContext alloc] init];
  resolve(@([context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:nil]));
}

RCT_EXPORT_METHOD(getEnrolledBiometrics
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  LAContext *context = [[LAContext alloc] init];
  NSMutableArray<NSString *> *biometrics = [NSMutableArray array];
  if ([context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:nil]) {
    if (context.biometryType == LABiometryTypeFaceID) {
      [biometrics addObject:@"face"];
    }
    if (context.biometryType == LABiometryTypeTouchID) {
      [biometrics addObject:@"fingerprint"];
    }
  }
  resolve(biometrics);
}

RCT_EXPORT_METHOD(authenticate
                  : (NSDictionary *)options strings
                  : (NSDictionary *)strings resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  [self authenticateWithOptions:options strings:strings completion:resolve];
}

- (void)authenticateWithOptions:(NSDictionary *)options
                        strings:(NSDictionary *)strings
                     completion:(RCTPromiseResolveBlock)completion
{
  LAContext *context = [[LAContext alloc] init];
  _lastOptions = nil;
  _lastStrings = nil;
  _lastCompletion = nil;
  context.localizedFallbackTitle = StringOrNil(strings[@"localizedFallbackTitle"]);
  LAPolicy policy = [options[@"biometricOnly"] boolValue]
      ? LAPolicyDeviceOwnerAuthenticationWithBiometrics
      : LAPolicyDeviceOwnerAuthentication;
  NSError *authError = nil;
  if ([context canEvaluatePolicy:policy error:&authError]) {
    __weak CartellLocalAuth *weakSelf = self;
    [context evaluatePolicy:policy
            localizedReason:StringOrNil(strings[@"reason"]) ?: @""
                      reply:^(BOOL success, NSError *error) {
                        dispatch_async(dispatch_get_main_queue(), ^{
                          [weakSelf handleAuthReplyWithSuccess:success
                                                         error:error
                                                       options:options
                                                       strings:strings
                                                    completion:completion];
                        });
                      }];
  } else if (authError != nil) {
    [self handleError:authError options:options strings:strings completion:completion];
  } else {
    completion(Details(@"failure", @"evaluatePolicy failed without an error", nil));
  }
}

- (void)showAlertWithMessage:(NSString *)message
          dismissButtonTitle:(NSString *)dismissButtonTitle
     openSettingsButtonTitle:(NSString *)openSettingsButtonTitle
                  completion:(RCTPromiseResolveBlock)completion
{
  UIViewController *controller = UIApplication.sharedApplication.delegate.window.rootViewController;
  if (controller == nil) {
    [self handleResultSucceeded:NO completion:completion];
    return;
  }
  UIAlertController *alert = [UIAlertController alertControllerWithTitle:@""
                                                                 message:message
                                                          preferredStyle:UIAlertControllerStyleAlert];
  __weak CartellLocalAuth *weakSelf = self;
  [alert addAction:[UIAlertAction actionWithTitle:dismissButtonTitle
                                            style:UIAlertActionStyleDefault
                                          handler:^(UIAlertAction *action) {
                                            [weakSelf handleResultSucceeded:NO completion:completion];
                                          }]];
  NSURL *url = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
  if (openSettingsButtonTitle != nil && url != nil) {
    [alert addAction:[UIAlertAction actionWithTitle:openSettingsButtonTitle
                                              style:UIAlertActionStyleDefault
                                            handler:^(UIAlertAction *action) {
                                              [UIApplication.sharedApplication openURL:url
                                                                               options:@{}
                                                                     completionHandler:nil];
                                              [weakSelf handleResultSucceeded:NO
                                                                   completion:completion];
                                            }]];
  }
  [controller presentViewController:alert animated:YES completion:nil];
}

- (void)handleAuthReplyWithSuccess:(BOOL)success
                             error:(NSError *)error
                           options:(NSDictionary *)options
                           strings:(NSDictionary *)strings
                        completion:(RCTPromiseResolveBlock)completion
{
  if (success) {
    [self handleResultSucceeded:YES completion:completion];
    return;
  }
  if (error != nil) {
    switch (error.code) {
      case LAErrorBiometryNotAvailable:
      case LAErrorBiometryNotEnrolled:
      case LAErrorBiometryLockout:
      case LAErrorUserFallback:
      case LAErrorPasscodeNotSet:
      case LAErrorAuthenticationFailed:
        [self handleError:error options:options strings:strings completion:completion];
        break;
      case LAErrorSystemCancel:
        if ([options[@"sticky"] boolValue]) {
          _lastOptions = options;
          _lastStrings = strings;
          _lastCompletion = completion;
        } else {
          [self handleResultSucceeded:NO completion:completion];
        }
        break;
      default:
        [self handleError:error options:options strings:strings completion:completion];
        break;
    }
  } else {
    completion(Details(@"failure", @"Unknown error from evaluatePolicy", nil));
  }
}

- (void)handleResultSucceeded:(BOOL)succeeded completion:(RCTPromiseResolveBlock)completion
{
  completion(Details(succeeded ? @"success" : @"failure", nil, nil));
}

- (void)handleError:(NSError *)authError
            options:(NSDictionary *)options
            strings:(NSDictionary *)strings
         completion:(RCTPromiseResolveBlock)completion
{
  NSString *result;
  switch (authError.code) {
    case LAErrorPasscodeNotSet:
    case LAErrorBiometryNotEnrolled:
      if ([options[@"useErrorDialogs"] boolValue]) {
        dispatch_async(dispatch_get_main_queue(), ^{
          [self showAlertWithMessage:StringOrNil(strings[@"goToSettingsDescription"])
                  dismissButtonTitle:StringOrNil(strings[@"cancelButton"])
             openSettingsButtonTitle:StringOrNil(strings[@"goToSettingsButton"])
                          completion:completion];
        });
        return;
      }
      result = authError.code == LAErrorPasscodeNotSet ? @"errorPasscodeNotSet" : @"errorNotEnrolled";
      break;
    case LAErrorUserCancel:
      result = @"errorUserCancelled";
      break;
    case LAErrorUserFallback:
      result = @"errorUserFallback";
      break;
    case LAErrorBiometryNotAvailable:
      result = @"errorBiometricNotAvailable";
      break;
    case LAErrorBiometryLockout:
      dispatch_async(dispatch_get_main_queue(), ^{
        [self showAlertWithMessage:StringOrNil(strings[@"lockOut"])
                dismissButtonTitle:StringOrNil(strings[@"cancelButton"])
           openSettingsButtonTitle:nil
                        completion:completion];
      });
      return;
    default:
      result = @"errorNotAvailable";
      break;
  }
  completion(Details(result, authError.localizedDescription, authError.domain));
}

- (void)applicationDidBecomeActive:(NSNotification *)notification
{
  if (_lastCompletion != nil) {
    [self authenticateWithOptions:_lastOptions strings:_lastStrings completion:_lastCompletion];
  }
}

@end
