// Port of frontend/lib/models/json_parser.dart (spec 05 §1): every model is parsed through
// JsonParserErrorTracker, and the cached ones through PersistedJsonParser too.

import type { DataPersistor } from '../services/data/dataPersistor';
import {
  CodedException,
  FormatException,
  JsonStructureProblemException,
  TriedToConvertFromWrongJsonTypeException,
} from '../services/exceptions';
import { isDartWhitespace } from '../utilities/textFormatters';
import type { AbstractModel } from './abstractModel';

export type Json = Record<string, unknown>;

/**
 * JsonParserErrorTracker.fromJson: a FormatException becomes
 * TriedToConvertFromWrongJsonTypeException, any other exception JsonStructureProblemException.
 * Errors (a TypeError, as Dart's failed casts are) pass through unchanged.
 * PORT-GAP: log.i("Parsing <T> : <json>").
 */
export function trackParse<T>(
  typeName: string,
  json: Json,
  fromJson: (json: Json) => T,
): T {
  try {
    return fromJson(json);
  } catch (e) {
    if (e instanceof FormatException) {
      throw new TriedToConvertFromWrongJsonTypeException(e.cause);
    }
    if (e instanceof CodedException) {
      throw new JsonStructureProblemException(`${e.name}:${e.toString()}`);
    }
    throw e;
  }
}

/** PersistedJsonParser.fromJson: the parsed object goes into the cache; the held one comes back. */
export function persist<T extends AbstractModel>(
  persistor: DataPersistor<T>,
  data: T,
): T {
  const result = persistor.add(data);
  if (result.failed) {
    throw new Error('Should never fail to add persisted piece of data.');
  }
  return result.data;
}

/** Dart's `double.tryParse(value.toString())`, as the Device parser reads coordinates. */
export function dartDoubleTryParse(value: unknown): number | null {
  const source = value === null || value === undefined ? 'null' : String(value);
  let start = 0;
  let end = source.length;
  while (start < end && isDartWhitespace(source.charCodeAt(start))) {
    start++;
  }
  while (end > start && isDartWhitespace(source.charCodeAt(end - 1))) {
    end--;
  }
  const body = source.slice(start, end);
  const special = /^([+-]?)(NaN|Infinity)$/.exec(body);
  if (special !== null) {
    if (special[2] === 'NaN') {
      return NaN;
    }
    return special[1] === '-' ? -Infinity : Infinity;
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(body)) {
    return null;
  }
  return Number(body);
}
