// Port of setUser from frontend/lib/services/requests/user_requests.dart (spec 04 §5).
// Other user calls (profile, notification policies, password, delete account, push tokens)
// arrive with their parts.

import { baseUrlHttp } from '../../config/environment';
import { parseUser, User } from '../../models/user';
import { persistUser } from '../data/userPersistor';
import {
  NoAccountInformationFoundException,
  UpdateStoredCredentialsFailedException,
} from '../exceptions';
import { reportError } from '../reportError';
import { AuthRequestManager } from './authRequests';
import { NetworkHelper } from './networkHelper';

/** auth() (e6196) → GET /auth/users/me/ → 200: the user, else 15955. */
export async function setUser(): Promise<User> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(
      new UpdateStoredCredentialsFailedException('Error Code e6196:'),
    );
    throw new UpdateStoredCredentialsFailedException('Failed to set user');
  }
  const response = await new NetworkHelper(
    `${baseUrlHttp()}/auth/users/me/`,
  ).getSecureData();
  if (response.statusCode === 200) {
    // userParser.fromJson parses and adds the user to DataPersistor<User>.
    // LATER(part 6): through the shared cache's parser, not the side menu's stand-in.
    return persistUser(parseUser(JSON.parse(response.body)));
  }
  reportError(new NoAccountInformationFoundException('Error Code 15955:'));
  throw new NoAccountInformationFoundException('Failed to fetch profile');
}
