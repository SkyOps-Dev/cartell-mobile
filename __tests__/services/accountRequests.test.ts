// The Account Settings calls (user_requests.dart, settings_requests.dart; spec 04 §5): what each
// sends, where (Django until each moves to Node), and what it does with the answer.

import * as Keychain from 'react-native-keychain';

import { baseUrlHttp } from '../../src/config/environment';
import {
  FetchSettingsException,
  NoAccountInformationFoundException,
  UnableToDeleteUserAccountException,
  UnableToUpdateUserInformationException,
  UpdateStoredCredentialsFailedException,
} from '../../src/services/exceptions';
import * as reporter from '../../src/services/reportError';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { getSetting } from '../../src/services/requests/settingsRequests';
import {
  deleteAccount,
  setProfile,
  setProfileNotificationPolicy,
  setUserEmailNotificationPolicy,
  updateUserData,
  updateUserPassword,
} from '../../src/services/requests/userRequests';
import { Result } from '../../src/services/result';
import { SecureStorage } from '../../src/services/secureStorage';
import { installFakeServer, RecordedRequest } from '../helpers/fakeServer';

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;
const FORM = 'application/x-www-form-urlencoded; charset=utf-8';

const profileJson = {
  user: 3,
  should_send_notification: true,
  locations: [{ id: 1, name: '(Default Location)', devices: [], groups: [] }],
  alexa_enabled: false,
};

let report: jest.SpyInstance;

beforeEach(() => {
  keychain.clear();
  jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.success());
  report = jest.spyOn(reporter, 'reportError');
});

afterEach(() => jest.restoreAllMocks());

/** The request after the maintenance probe. */
function sent(requests: RecordedRequest[]) {
  return requests.filter(r => r.path !== '/maintenance-mode/');
}

const reported = () =>
  report.mock.calls.map(([error]) => (error as { cause?: string }).cause);

describe('setProfile', () => {
  test('GET /profiles/me on Django, without the trailing slash, parsed', async () => {
    const { requests, fetchMock } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /profiles/me': { status: 200, body: profileJson },
    });
    const profile = await setProfile();
    expect(profile).toEqual({
      user: 3,
      shouldSendNotification: true,
      locations: profileJson.locations,
      alexaEnabled: false,
    });
    expect(sent(requests)).toEqual([
      expect.objectContaining({ method: 'GET', path: '/profiles/me' }),
    ]);
    expect(fetchMock.mock.calls[1][0]).toBe(`${baseUrlHttp()}/profiles/me`);
  });

  test('any other status reports 9eae2 and throws', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /profiles/me': { status: 500 },
    });
    await expect(setProfile()).rejects.toBeInstanceOf(
      NoAccountInformationFoundException,
    );
    expect(reported()).toEqual(['Error Code 9eae2:']);
  });

  test('a failed session check reports b323c and sends nothing', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    const { fetchMock } = installFakeServer({});
    await expect(setProfile()).rejects.toBeInstanceOf(
      UpdateStoredCredentialsFailedException,
    );
    expect(reported()).toEqual(['Error Code b323c:']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('updateUserData', () => {
  test('PATCH /auth/users/me/ with the fields as a form; 200 gives the body', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'PATCH /auth/users/me/': { status: 200, body: '{"id":3}' },
    });
    await expect(
      updateUserData({ body: { first_name: 'A B', last_name: 'C&D' } }),
    ).resolves.toBe('{"id":3}');
    const [request] = sent(requests);
    expect(request.method).toBe('PATCH');
    expect(request.body).toBe('first_name=A+B&last_name=C%26D');
    expect(request.headers['content-type']).toBe(FORM);
  });

  test('anything but 200 reports 68abd and throws', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'PATCH /auth/users/me/': { status: 400 },
    });
    await expect(
      updateUserData({ body: { phone_no: 'x'.repeat(16) } }),
    ).rejects.toBeInstanceOf(UnableToUpdateUserInformationException);
    expect(reported()).toEqual(['Error Code 68abd:']);
  });

  test('a failed session check reports 418d4', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    installFakeServer({});
    await expect(updateUserData({ body: {} })).rejects.toBeInstanceOf(
      UpdateStoredCredentialsFailedException,
    );
    expect(reported()).toEqual(['Error Code 418d4:']);
  });
});

describe('the two notification switches', () => {
  test.each([
    [
      'notifications',
      setProfileNotificationPolicy,
      'PATCH /profiles/me/',
      'should_send_notification',
      'Error Code aa1dc:',
    ],
    [
      'email notifications',
      setUserEmailNotificationPolicy,
      'PATCH /auth/users/me/',
      'should_send_emails',
      'Error Code f5e37:',
    ],
  ] as const)(
    '%s: "true"/"false" as text; failure reports its code',
    async (_name, call, route, field, failureCode) => {
      const { requests } = installFakeServer({
        'GET /maintenance-mode/': { status: 200 },
        [route]: { status: 200 },
      });
      await call(true);
      await call(false);
      expect(sent(requests).map(r => r.body)).toEqual([
        `${field}=true`,
        `${field}=false`,
      ]);

      installFakeServer({
        'GET /maintenance-mode/': { status: 200 },
        [route]: { status: 403 },
      });
      await expect(call(true)).rejects.toBeInstanceOf(
        UnableToUpdateUserInformationException,
      );
      expect(reported()).toEqual([failureCode]);
    },
  );

  test('their session-check codes are 8ba3d and 5e49a', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    installFakeServer({});
    await expect(setProfileNotificationPolicy(true)).rejects.toBeInstanceOf(
      UpdateStoredCredentialsFailedException,
    );
    await expect(setUserEmailNotificationPolicy(true)).rejects.toBeInstanceOf(
      UpdateStoredCredentialsFailedException,
    );
    expect(reported()).toEqual(['Error Code 8ba3d:', 'Error Code 5e49a:']);
  });
});

test('updateUserPassword posts to set_password and returns whatever came back', async () => {
  const { requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/users/set_password/': {
      status: 400,
      body: { current_password: ['Invalid password.'] },
    },
  });
  const response = await updateUserPassword({
    body: { current_password: 'old', new_password: 'New#Passw0rd' },
  });
  expect(response.statusCode).toBe(400);
  expect(sent(requests)[0].body).toBe(
    'current_password=old&new_password=New%23Passw0rd',
  );
  expect(reported()).toEqual([]);
});

describe('deleteAccount', () => {
  async function storeSession() {
    await SecureStorage.setAccessToken('A');
    await SecureStorage.setRefreshToken('R');
    await SecureStorage.setBiometricsEnabled(true);
  }

  test.each([204, 400, 500])(
    'a %i still clears the session, the biometric setting and the legacy keys (Q2)',
    async status => {
      await storeSession();
      const purge = jest.spyOn(SecureStorage, 'purgeLegacyCredentials');
      const { requests } = installFakeServer({
        'GET /maintenance-mode/': { status: 200 },
        'DELETE /auth/users/me/': { status },
      });
      const response = await deleteAccount({ password: 'p@ss word' });
      expect(response.statusCode).toBe(status);
      expect(sent(requests)[0]).toEqual(
        expect.objectContaining({
          method: 'DELETE',
          body: 'current_password=p%40ss+word',
        }),
      );
      expect(purge).toHaveBeenCalled();
      expect(await SecureStorage.getAccessToken()).toBeNull();
      expect(await SecureStorage.getRefreshToken()).toBeNull();
      expect(await SecureStorage.getBiometricsEnabled()).toBeNull();
    },
  );

  test('a failed session check throws first and clears nothing', async () => {
    await storeSession();
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    installFakeServer({});
    await expect(deleteAccount({ password: 'x' })).rejects.toBeInstanceOf(
      UnableToDeleteUserAccountException,
    );
    expect(reported()).toEqual(['Error Code 7e945:']);
    expect(await SecureStorage.getAccessToken()).toBe('A');
  });

  test('no answer at all throws and clears nothing', async () => {
    await storeSession();
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'DELETE /auth/users/me/': () => {
        throw new TypeError('Network request failed');
      },
    });
    await expect(deleteAccount({ password: 'x' })).rejects.toThrow(
      'Network request failed',
    );
    expect(await SecureStorage.getRefreshToken()).toBe('R');
  });
});

describe('getSetting', () => {
  test('GET /app/settings/?code=<key>, the value read as Dart reads a bool', async () => {
    const { fetchMock } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /app/settings/': {
        status: 200,
        body: { id: 1, key: 'alexa_enabled', value: 'true' },
      },
    });
    await expect(getSetting({ settingKey: 'alexa_enabled' })).resolves.toEqual({
      id: 1,
      key: 'alexa_enabled',
      value: true,
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${baseUrlHttp()}/app/settings/?code=alexa_enabled`,
    );
  });

  test('a missing setting (404) reports 9eae2 and throws', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /app/settings/': {
        status: 404,
        body: { error: 'Setting not found' },
      },
    });
    await expect(
      getSetting({ settingKey: 'alexa_enabled' }),
    ).rejects.toBeInstanceOf(NoAccountInformationFoundException);
    expect(reported()).toEqual(['Error Code 9eae2:']);
  });

  test('a failed session check reports b323c as FetchSettingsException', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    installFakeServer({});
    await expect(
      getSetting({ settingKey: 'alexa_enabled' }),
    ).rejects.toBeInstanceOf(FetchSettingsException);
    expect(reported()).toEqual(['Error Code b323c:']);
  });
});
