// Port of frontend/lib/services/requests/settings_requests.dart (spec 04 §5): server-side
// switches the app reads by key (the ConfigItem table).

import { nodeBaseUrlHttp } from '../../config/environment';
import { parseSetting, Setting } from '../../models/setting';
import {
  FetchSettingsException,
  NoAccountInformationFoundException,
} from '../exceptions';
import { reportError } from '../reportError';
import { AuthRequestManager } from './authRequests';
import { NetworkHelper } from './networkHelper';

/** The key Account Settings reads to decide whether to show "Connected Services". */
export const alexaEnabledAccessKey = 'alexa_enabled';

/** auth() (b323c) → GET /app/settings/?code=<key> → 200: the setting, else 9eae2. */
export async function getSetting({
  settingKey,
}: {
  settingKey: string;
}): Promise<Setting> {
  const status = await new AuthRequestManager().auth();
  if (status.failed) {
    reportError(new FetchSettingsException('Error Code b323c:'));
    throw new FetchSettingsException(
      `Failed to get setting for key ${settingKey}`,
    );
  }
  // The key goes into the URL as it is, unencoded, as Flutter builds it. On the Node backend
  // since 2026-10-22.
  const response = await new NetworkHelper(
    `${nodeBaseUrlHttp()}/app/settings/?code=${settingKey}`,
  ).getSecureData();
  if (response.statusCode === 200) {
    return parseSetting(JSON.parse(response.body));
  }
  reportError(new NoAccountInformationFoundException('Error Code 9eae2:'));
  throw new NoAccountInformationFoundException(
    `Failed to get setting for key ${settingKey}`,
  );
}
