// Port of frontend/lib/models/setting_model.dart (spec 05): one row of the server's ConfigItem
// table, whose value is always text.

export type Setting = {
  id: number;
  key: string;
  value: boolean;
};

/**
 * SettingParser.fromJson. The value is read with Dart's `bool.tryParse(value.toString())`, which
 * is case-sensitive: only "true" is true; "True", "1" and anything else are false.
 */
export function parseSetting(json: Record<string, unknown>): Setting {
  return {
    id: (json.id as number | null | undefined) ?? 0,
    key: (json.key as string | null | undefined) ?? '',
    value: dartToString(json.value) === 'true',
  };
}

/** Dart's toString for a decoded JSON value, as far as "true" can come out of it. */
function dartToString(value: unknown): string {
  return value === null || value === undefined ? 'null' : String(value);
}
