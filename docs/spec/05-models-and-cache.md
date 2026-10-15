# 05 — Models and In-Memory Cache

Plan step: 4.7. Sources: `models/*.dart`, `services/data/data_persistor.dart`,
`utilities/start_services.dart`.

## 1. Parsing pipeline

- `JsonParser<T>` provides `fromJson` and `toJson`.
- `JsonParserErrorTracker` logs `Parsing <T> : <json>` at info level. A `FormatException`
  becomes `TriedToConvertFromWrongJsonTypeException`, and any other `Exception` becomes
  `JsonStructureProblemException`. A Dart `Error` (for example a null cast) is **not**
  wrapped and propagates as is.
- `PersistedJsonParser` parses, then `DataPersistor.add(obj)`, and **returns the persisted
  instance**. For an id already cached, that is the *existing* object with its fields merged in.
- Registered parsers:
  - Persisted: User, Firmware, Results, Sensor, Device, Location.
  - Not persisted: FirmwareUpdate, Connection, DeviceModel, Event, DeviceMeta, Profile, Setting.
  - Nested parsers resolve through the registry, so nested Sensors inside a Device are persisted
    too. `FirmwareUpdate.firmware` uses a **raw** `FirmwareParser()`, so it is not persisted.

## 2. DataPersistor<T> semantics (must be replicated)

- An in-memory `Map<int, T>` per model type. There is one singleton each for Device, Sensor,
  Location, Results, User and Firmware.
- `add(obj)`:
  - **Id exists**: `existing.updateModel(obj)` (copies the fields listed below, keeps
    `retrievedAt` at the max, notifies the model's listeners) and returns `existing`.
  - **New id**: store it, subscribe to the model, notify the persistor's listeners.
- `remove`, `getById` (ResultOf), `getAll`, `hasObj`, `notify`.
- Models are ChangeNotifiers. Screens listen to them directly:
  - `DevicesScreen` uses `ListenableBuilder(DataPersistor<Device>)`.
  - `SynchronizedAutoSwitch` listens to its model.
  - `NavBar` reads the first User in the persistor and **throws `NoUserObjectFound` if it is
    empty**.
- Because a refetch returns the **same instance**, screens holding a Device or Sensor see new
  values without re-navigation. The bloc states add a `RefreshState` or timestamp so the
  "equal" state still re-emits (spec 06).

## 3. Models and fields (JSON key → field)

### User (persisted)

`id`, `email`, `first_name`, `last_name`, `phone_no` (nullable), `should_send_emails` (bool, no
default). `updateFields` copies all of them.

### Profile (not persisted)

`user` (int), `should_send_notification`, `locations` (list of Location), `alexa_enabled`.

### Location (persisted)

`id`, `name`, `devices` (list of Device).

### Device (persisted; the hub registration)

| JSON | Field | Parse rule |
|---|---|---|
| `id` | id | |
| `name` | name | |
| `location` | location (int) | |
| `latitude`, `longitude` | double? | `double.tryParse(value.toString())`, so null becomes null |
| `archived` | bool | `?? false` |
| `should_use_onboard_sensor` | bool | `?? false` |
| `added_date` | DateTime | `DateTime.parse` (required) |
| `archived_date` | raw | assigned as is |
| `device` | DeviceMeta | nested |
| `should_send_notification` | bool | no default |
| `should_send_connection_notification` | bool | **no default** (null → TypeError on parse) |
| `should_send_email` | bool | `?? false` |
| `should_use_emulated_sensor` | bool | `?? false` |

- `updateFields` copies name, latitude, longitude, archived, shouldUseOnboardSensor,
  shouldSendNotification, shouldSendConnectionNotification, shouldSendEmail, archivedDate and
  device. It does **not** copy `location`, `addedDate` or **`shouldUseEmulatedSensor`** (spec 19).
- Getter `hasBlacklistedSensor` = any `device.sensors[i].isBlacklisted`.

### DeviceMeta (the produced hub; not persisted)

`id`, `is_connected`, `mac_address`, `esp32_app_version` (int?), `rfm6601_app_version` (int?),
`device_model` (`{name?, release_date?}`), `connections` (list of Connection), `sensors` (list of
Sensor), `is_blacklisted`.

### Connection

`ip_address`, `port`, `is_active`, `connection_date` (parsed), `disconnection_date` (parsed or
null).

### Sensor (persisted)

| JSON | Field | Rule |
|---|---|---|
| `id` | id | |
| `sensor_id` | sensorId (string) | |
| `name` | name | |
| `longitude`, `latitude` | String? | strings, not numbers |
| `has_low_battery` | bool? | |
| `is_active` | bool? | |
| `connection_date` | DateTime | `DateTime.parse` (required) |
| `disconnection_date` | String? | |
| `should_send_notification` | bool | |
| `fw_version` | int? | |
| `sensor_type` | String? | `"ON"` = onboard sensor |
| `is_blacklisted` | bool | |

- `hasLatLong()` = both coordinates are non-null. `isOnboardSensor()` = `sensor_type == "ON"`.
- `updateFields` copies everything **except `isBlacklisted`** (spec 19).

### Event (activation page; not persisted)

`count`, `next`, `previous`, `results` (list of Results).

### Results (an event row; persisted)

`id`, `device`, `device_name`, `sensor`, `event_type`, `sensor_name`, `time`, `location`,
`added_date`. All are strings or ints as received. `updateFields` does not copy `eventType`.

### EventType

| DB value | Type | Icon | Label |
|---|---|---|---|
| `CO` | connection | FA houseCircleCheck | "Connected" |
| `AC` | activation | FA carOn | "Motion Detected" |
| `DC` | disconnection | FA houseCircleXmark | "Disconnected" |
| anything else (including legacy `PS`) | activation | | |

### Firmware (persisted)

`id`, `version_number` (int?), `release_date` (string?), `stable`, `supported`, `processor`
(`"ESP32"` = controller; anything else = transmitter, for example `"RFM6601"`).

### FirmwareUpdate (not persisted)

`id`, `file_size`, `file_cursor`, `status` (`PENDING` / `RUNNING` / `FAILED` / `SUCCEEDED`),
`message`, `date_started` (parsed or null), `date_ended`, `firmware` (Firmware).

### Setting

`id ?? 0`, `key ?? ""`, `value = bool.tryParse(value.toString()) ?? false`.

## 4. Port notes

- Keep identity semantics: the RN cache must hand back the **same object** for an id and notify
  subscribers on merge. Several behaviours depend on this, including the add-sensor "new sensor"
  detection (spec 13 §6) and screens updating in place.
- Keep the non-merged fields, so stale flags behave exactly as in Flutter.
- Dates: `DateTime.parse` accepts ISO-8601 with an offset. Display code converts with
  `toLocal()`.
