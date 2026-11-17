// Port of frontend/lib/models/event.dart (spec 05, spec 12): one page of the event history
// (Event) and its events (Results, cached), with the EventType table the history card draws from.
//
// Quirk kept: the activation's database label is written "AC", but the server sends "AV", so
// EventType.get falls through to its default, which is activation anyway. Every type but CO and
// DC (SC, FS, FF, TN) is therefore shown as "Motion Detected".

import type { IconData } from '../components/icons/iconData';
import { FontAwesomeIcons } from '../components/icons/iconData';
import { resultsPersistor } from '../services/data/persistors';
import { AbstractModel } from './abstractModel';
import { Json, persist, trackParse } from './jsonParser';

/** A page of events: `next` is the server's link to the following page, or null. */
export class Event {
  constructor(
    readonly count: number | null = null,
    readonly next: string | null = null,
    readonly previous: string | null = null,
    readonly results: Results[] | null = null,
  ) {}
}

export type EventType = {
  readonly icon: IconData;
  readonly dbLabel: string;
  readonly label: string;
};

export const EventTypes = {
  connection: {
    icon: FontAwesomeIcons.houseCircleCheck,
    dbLabel: 'CO',
    label: 'Connected',
  },
  activation: {
    icon: FontAwesomeIcons.carOn,
    dbLabel: 'AC',
    label: 'Motion Detected',
  },
  disconnection: {
    icon: FontAwesomeIcons.houseCircleXmark,
    dbLabel: 'DC',
    label: 'Disconnected',
  },
} as const satisfies Record<string, EventType>;

/** EventType.get: by database label, else activation. */
export function eventTypeFor(label: string): EventType {
  if (label === EventTypes.connection.dbLabel) {
    return EventTypes.connection;
  }
  if (label === EventTypes.activation.dbLabel) {
    return EventTypes.activation;
  }
  if (label === EventTypes.disconnection.dbLabel) {
    return EventTypes.disconnection;
  }
  return EventTypes.activation;
}

/** One event. */
export class Results extends AbstractModel {
  constructor(
    id: number,
    public device: number | null,
    public deviceName: string | null,
    public sensor: number | null,
    public eventType: EventType,
    public sensorName: string | null,
    public time: string | null,
    public location: string | null,
    public addedDate: string | null,
  ) {
    super(id);
  }

  /** Everything but eventType, as in Flutter. */
  updateFields(model: AbstractModel): void {
    const other = model as Results;
    this.device = other.device;
    this.deviceName = other.deviceName;
    this.sensor = other.sensor;
    this.sensorName = other.sensorName;
    this.time = other.time;
    this.location = other.location;
    this.addedDate = other.addedDate;
  }
}

const orNull = <T>(value: unknown): T | null =>
  value === undefined ? null : (value as T | null);

/** ResultsParser through JsonParserErrorTracker, then the cache (PersistedJsonParser). */
export function parseResults(json: Json): Results {
  return persist(
    resultsPersistor,
    trackParse(
      'Results',
      json,
      j =>
        new Results(
          j.id as number,
          orNull<number>(j.device),
          orNull<string>(j.device_name),
          orNull<number>(j.sensor),
          eventTypeFor(j.event_type as string),
          orNull<string>(j.sensor_name),
          orNull<string>(j.time),
          orNull<string>(j.location),
          orNull<string>(j.added_date),
        ),
    ),
  );
}

/** EventParser through JsonParserErrorTracker (not cached). */
export function parseEvent(json: Json): Event {
  return trackParse(
    'Event',
    json,
    j =>
      new Event(
        orNull<number>(j.count),
        orNull<string>(j.next),
        orNull<string>(j.previous),
        (j.results as Json[]).map(parseResults),
      ),
  );
}
