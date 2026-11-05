// A hub as GET /devices/ returns it (Django's DeviceSerializer), for tests that need the Device
// parser to accept it. Override any top-level field, or the nested `device`.

type Json = Record<string, unknown>;

export function hubJson(
  overrides: Json & { device?: Json } = {},
): Json & { device: Json } {
  const { device, ...rest } = overrides;
  return {
    id: 7,
    name: 'Gate',
    location: 1,
    group: null,
    latitude: null,
    longitude: null,
    archived: false,
    added_date: '2026-10-21T07:00:00.123456-05:00',
    archived_date: null,
    should_send_notification: true,
    should_send_connection_notification: false,
    should_use_onboard_sensor: false,
    should_send_email: true,
    should_use_emulated_sensor: false,
    ...rest,
    device: {
      id: 31,
      mac_address: '48:27:e2:b1:94:44',
      is_connected: false,
      esp32_app_version: 1025,
      rfm6601_app_version: 7,
      device_model: { name: 'Hub v1', release_date: '2023-10-31' },
      connections: [],
      sensors: [],
      is_blacklisted: false,
      ...device,
    },
  };
}
