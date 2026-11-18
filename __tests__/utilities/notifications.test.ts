// initFirebase (frontend/lib/utilities/notifications.dart; spec 09 §2): the background handler is
// set at start-up, an alert while the app is open is shown by the app itself, and a token refresh
// is stored and, when signed in, sent.

import {
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';

import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import {
  backgroundHandler,
  initFirebase,
} from '../../src/utilities/notifications';
import { flush, installFakeServer } from '../helpers/fakeServer';

const store = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;
const show = NativeModules.CartellNotifications.show as jest.Mock;

/** Runs initFirebase and returns the listeners it gave Firebase. */
function start() {
  (onMessage as jest.Mock).mockClear();
  (onTokenRefresh as jest.Mock).mockClear();
  initFirebase();
  return {
    message: (onMessage as jest.Mock).mock.calls[0][1] as (m: object) => void,
    refresh: (onTokenRefresh as jest.Mock).mock.calls[0][1] as (
      t: string,
    ) => void,
  };
}

async function settle() {
  for (let i = 0; i < 10; i++) {
    await flush();
  }
}

beforeEach(() => {
  store.clear();
  show.mockClear();
  AuthRequestManager.resetSingleFlightForTesting();
});

test('the background handler is set at start-up, and only logs', async () => {
  (setBackgroundMessageHandler as jest.Mock).mockClear();
  initFirebase();
  expect(setBackgroundMessageHandler).toHaveBeenCalledWith(
    expect.anything(),
    backgroundHandler,
  );
  await expect(
    backgroundHandler({ messageId: 'm', data: {} } as never),
  ).resolves.toBeUndefined();
});

test('an alert while the app is open is shown by the app, id 0', async () => {
  const { message } = start();
  message({
    notification: { title: 'Activity Detected', body: 'Front Door' },
    data: {},
  });
  await settle();
  expect(show.mock.calls).toEqual([[0, 'Activity Detected', 'Front Door']]);
});

test('a message with no alert part shows nothing', async () => {
  const { message } = start();
  message({ data: { a: '1' } });
  await settle();
  expect(show).not.toHaveBeenCalled();
});

describe('token refresh', () => {
  test('the same token: nothing', async () => {
    await SecureStorage.setAccessToken('A');
    await SecureStorage.setFCMToken('same');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
    });
    start().refresh('same');
    await settle();
    expect(requests.filter(r => r.path.includes('notifications'))).toEqual([]);
  });

  test('a new token while signed out: stored, not sent', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
    });
    start().refresh('new');
    await settle();
    expect(await SecureStorage.getFCMToken()).toBe('new');
    expect(requests.filter(r => r.path.includes('notifications'))).toEqual([]);
  });

  test('a new token while signed in: stored and sent', async () => {
    await SecureStorage.setAccessToken('A');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /notifications/register_device/': { status: 201 },
    });
    start().refresh('new');
    await settle();
    expect(await SecureStorage.getFCMToken()).toBe('new');
    const sent = requests.filter(r => r.path.includes('notifications'));
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain('token=new');
  });
});
