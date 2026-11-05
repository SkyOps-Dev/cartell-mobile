// Port of frontend/lib/models/profile.dart (spec 05). Not cached, but its locations are, and so
// are their hubs: a profile read refreshes every hub it carries. A location or hub that cannot be
// read fails the parse, and with it the screen that asked for the profile.

import { Json, trackParse } from './jsonParser';
import { Location, parseLocation } from './location';

export type Profile = {
  user: number;
  shouldSendNotification: boolean;
  locations: Location[];
  alexaEnabled: boolean;
};

export function parseProfile(json: Json): Profile {
  return trackParse('Profile', json, j => ({
    user: j.user as number,
    shouldSendNotification: j.should_send_notification as boolean,
    locations: (j.locations as Json[]).map(parseLocation),
    alexaEnabled: j.alexa_enabled as boolean,
  }));
}
