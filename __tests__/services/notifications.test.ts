// NotificationApi (frontend/lib/services/notifications.dart): when it asks for permission
// (permission_handler 12 on Android 13+ only; on iOS the plugin's initialize asks), and what it
// passes to the native alert (flutter_local_notifications 18.0.1).

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import { NotificationApi } from '../../src/services/notifications';

const POST = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
const native = NativeModules.CartellNotifications;

beforeEach(() => {
  native.initialize.mockClear();
  native.show.mockClear();
});
afterEach(() => jest.restoreAllMocks());

describe('init on Android 13+', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(35);
  });

  test('asks for the notification permission when it is not granted, then initializes', async () => {
    const order: string[] = [];
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    const request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockImplementation(async () => {
        order.push('request');
        return PermissionsAndroid.RESULTS.DENIED;
      });
    native.initialize.mockImplementationOnce(async () => {
      order.push('initialize');
      return true;
    });
    await NotificationApi.init();
    expect(request).toHaveBeenCalledWith(POST);
    expect(order).toEqual(['request', 'initialize']);
  });

  test('does not ask when it is granted', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    const request = jest.spyOn(PermissionsAndroid, 'request');
    await NotificationApi.init();
    expect(request).not.toHaveBeenCalled();
    expect(native.initialize).toHaveBeenCalledTimes(1);
  });
});

test.each([
  ['android', 32],
  ['ios', '17.0'],
])(
  'init on %s %s: no permission step, only initialize',
  async (os, version) => {
    jest.replaceProperty(Platform, 'OS', os as typeof Platform.OS);
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(version as never);
    const check = jest.spyOn(PermissionsAndroid, 'check');
    const request = jest.spyOn(PermissionsAndroid, 'request');
    await NotificationApi.init();
    expect(check).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(native.initialize).toHaveBeenCalledTimes(1);
  },
);

test('showNotification uses id 0 unless given, and passes a missing title or body as null', async () => {
  await NotificationApi.showNotification({
    title: 'Hub Disconnected!',
    body: 'b',
  });
  await NotificationApi.showNotification({ id: 3 });
  expect(native.show.mock.calls).toEqual([
    [0, 'Hub Disconnected!', 'b'],
    [3, null, null],
  ]);
});
