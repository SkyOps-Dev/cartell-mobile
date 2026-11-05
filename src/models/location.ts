// Port of frontend/lib/models/location.dart (spec 05 §3): one of a profile's locations, with its
// hubs. Cached; its groups are not read.

import { locationPersistor } from '../services/data/persistors';
import { AbstractModel } from './abstractModel';
import { Device, parseDevice } from './device';
import { Json, persist, trackParse } from './jsonParser';

export class Location extends AbstractModel {
  constructor(id: number, public name: string, public devices: Device[]) {
    super(id);
  }

  updateFields(model: AbstractModel): void {
    const other = model as Location;
    this.name = other.name;
    this.devices = other.devices;
  }
}

/** The Location parser: parse (its hubs go into their cache), then the cached object. */
export function parseLocation(json: Json): Location {
  return persist(
    locationPersistor,
    trackParse(
      'Location',
      json,
      j =>
        new Location(
          j.id as number,
          j.name as string,
          (j.devices as Json[]).map(parseDevice),
        ),
    ),
  );
}
