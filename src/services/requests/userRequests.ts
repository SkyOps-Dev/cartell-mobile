// Port of the account calls in frontend/lib/services/requests/user_requests.dart (spec 04 §5).
// PORT-GAP: the push-token calls (postMessagingData, validateMessagingData,
// deleteMessagingData).
//
// Each call checks the session first (auth()) and reports its own code when that fails. Each
// call site picks its server: nodeBaseUrlHttp() once that endpoint is on Node, baseUrlHttp() (Django)
// until then.

import { baseUrlHttp, nodeBaseUrlHttp } from '../../config/environment';
import { parseProfile, Profile } from '../../models/profile';
import { parseUser, User } from '../../models/user';
import { persistUser } from '../data/userPersistor';
import {
  NoAccountInformationFoundException,
  UnableToDeleteUserAccountException,
  UnableToUpdateUserInformationException,
  UpdateStoredCredentialsFailedException,
} from '../exceptions';
import { reportError } from '../reportError';
import { SecureStorage } from '../secureStorage';
import { AuthRequestManager } from './authRequests';
import { HttpResponse, NetworkHelper } from './networkHelper';

/** auth() fails → report `code` and throw `exception` with `message`. */
async function requireSession(
  Exception: new (cause: string) => Error,
  code: string,
  message: string,
): Promise<void> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new Exception(code));
    throw new Exception(message);
  }
}

/**
 * auth() (b323c) → GET /profiles/me (no trailing slash: the server redirects it to /profiles/me/
 * and the request follows) → 200: the profile, else 9eae2.
 */
export async function setProfile(): Promise<Profile> {
  await requireSession(
    UpdateStoredCredentialsFailedException,
    'Error Code b323c:',
    'Failed to set profile',
  );
  const response = await new NetworkHelper(
    // On the Node backend since 2026-10-22; Node redirects the
    // missing slash as Django does.
    `${nodeBaseUrlHttp()}/profiles/me`,
  ).getSecureData();
  if (response.statusCode === 200) {
    return parseProfile(JSON.parse(response.body));
  }
  reportError(new NoAccountInformationFoundException('Error Code 9eae2:'));
  throw new NoAccountInformationFoundException('Failed to fetch profile');
}

/** auth() (e6196) → GET /auth/users/me/ → 200: the user, else 15955. */
export async function setUser(): Promise<User> {
  await requireSession(
    UpdateStoredCredentialsFailedException,
    'Error Code e6196:',
    'Failed to set user',
  );
  const response = await new NetworkHelper(
    // On the Node backend since 2026-10-21.
    `${nodeBaseUrlHttp()}/auth/users/me/`,
  ).getSecureData();
  if (response.statusCode === 200) {
    // userParser.fromJson parses and adds the user to DataPersistor<User>.
    // PORT-GAP: through the shared cache's parser, not the side menu's stand-in.
    return persistUser(parseUser(JSON.parse(response.body)));
  }
  reportError(new NoAccountInformationFoundException('Error Code 15955:'));
  throw new NoAccountInformationFoundException('Failed to fetch profile');
}

/** auth() (418d4) → PATCH /auth/users/me/ with `body` → 200: the response text, else 68abd. */
export async function updateUserData({
  body,
}: {
  body: Record<string, string>;
}): Promise<string> {
  await requireSession(
    UpdateStoredCredentialsFailedException,
    'Error Code 418d4:',
    'Failed to set user',
  );
  const response = await new NetworkHelper(
    // On the Node backend since 2026-10-22.
    `${nodeBaseUrlHttp()}/auth/users/me/`,
  ).patchSecureData({ body });
  if (response.statusCode === 200) {
    return response.body;
  }
  reportError(new UnableToUpdateUserInformationException('Error Code 68abd:'));
  throw new UnableToUpdateUserInformationException('Failed to update profile');
}

/** Dart's bool.toString. */
const dartBool = (value: boolean) => (value ? 'true' : 'false');

/** auth() (8ba3d) → PATCH /profiles/me/ should_send_notification → 200, else aa1dc. */
export async function setProfileNotificationPolicy(
  shouldEnable: boolean,
): Promise<void> {
  await requireSession(
    UpdateStoredCredentialsFailedException,
    'Error Code 8ba3d:',
    'Failed to set user',
  );
  const response = await new NetworkHelper(
    // On the Node backend since 2026-10-22.
    `${nodeBaseUrlHttp()}/profiles/me/`,
  ).patchSecureData({
    body: { should_send_notification: dartBool(shouldEnable) },
  });
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body), log.i('successfully updated').
    return;
  }
  reportError(new UnableToUpdateUserInformationException('Error Code aa1dc:'));
  throw new UnableToUpdateUserInformationException('Failed to update profile');
}

/** auth() (5e49a) → PATCH /auth/users/me/ should_send_emails → 200, else f5e37. */
export async function setUserEmailNotificationPolicy(
  shouldEnable: boolean,
): Promise<void> {
  await requireSession(
    UpdateStoredCredentialsFailedException,
    'Error Code 5e49a:',
    'Failed to set user',
  );
  const response = await new NetworkHelper(
    // On the Node backend since 2026-10-22.
    `${nodeBaseUrlHttp()}/auth/users/me/`,
  ).patchSecureData({
    body: { should_send_emails: dartBool(shouldEnable) },
  });
  if (response.statusCode === 200) {
    // PORT-GAP: log.i(response.body), log.i('successfully updated').
    return;
  }
  reportError(new UnableToUpdateUserInformationException('Error Code f5e37:'));
  throw new UnableToUpdateUserInformationException('Failed to update profile');
}

/** auth() (7e945) → POST /auth/users/set_password/ with `body`. The response, whatever it is. */
export async function updateUserPassword({
  body,
}: {
  body: Record<string, string>;
}): Promise<HttpResponse> {
  await requireSession(
    UpdateStoredCredentialsFailedException,
    'Error Code 7e945:',
    'Failed to set user',
  );
  return new NetworkHelper(
    // On the Node backend since 2026-10-22.
    `${nodeBaseUrlHttp()}/auth/users/set_password/`,
  ).postSecureData({ body });
}

/**
 * auth() (7e945, reused) → DELETE /auth/users/me/ with current_password (a form body on a
 * DELETE). Then, whatever the answer, the legacy keys, the biometric setting and both tokens are
 * deleted (quirk Q2). A failed session check or a network error throws before any of that.
 */
export async function deleteAccount({
  password,
}: {
  password: string;
}): Promise<HttpResponse> {
  await requireSession(
    UnableToDeleteUserAccountException,
    'Error Code 7e945:',
    'Failed to set user',
  );
  const response = await new NetworkHelper(
    `${baseUrlHttp()}/auth/users/me/`,
  ).secureDelete({ body: { current_password: password } });

  await SecureStorage.purgeLegacyCredentials();
  await SecureStorage.deleteBiometricsEnabled();
  await SecureStorage.deleteRefreshToken();
  await SecureStorage.deleteAccessToken();

  // PORT-GAP: log.i(res.statusCode), log.i(res.body).
  return response;
}
