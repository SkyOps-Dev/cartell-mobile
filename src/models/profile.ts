// Port of frontend/lib/models/profile.dart (spec 05). Parsing only.
// PORT-GAP: the locations as Location models (location.dart: id, name, and each location's
// devices parsed with the Device model; its groups are not read). Flutter's parse throws on a
// location or hub it cannot read, which fails the screen that asked for the profile. Until the
// Device model exists the locations are kept as the server's JSON.

export type RawLocation = Record<string, unknown>;

export type Profile = {
  user: number;
  shouldSendNotification: boolean;
  locations: RawLocation[];
  alexaEnabled: boolean;
};

export function parseProfile(json: Record<string, unknown>): Profile {
  return {
    user: json.user as number,
    shouldSendNotification: json.should_send_notification as boolean,
    locations: json.locations as RawLocation[],
    alexaEnabled: json.alexa_enabled as boolean,
  };
}
