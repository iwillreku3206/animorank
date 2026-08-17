import type { JsonValue } from '@zenstackhq/orm';

export type IntoJsonValue = string | number | boolean | null | { toJSON(): JsonValue } | IntoJsonObject | IntoJsonArray;

export type IntoJsonObject = {
  [key: string]: IntoJsonValue;
};

export type IntoJsonArray = IntoJsonValue[];

/**
 * Recursively convert a value into a plain JSON value. Objects exposing a
 * `toJSON` method are converted through it; plain objects and arrays are
 * converted member-wise. Non-POJO values without `toJSON` are rejected here so
 * they surface at the conversion site instead of at a serialization boundary
 * (e.g. a SvelteKit load function).
 */
export function toJsonValue(value: IntoJsonValue): JsonValue {
  return toJsonValueDeep(value) as JsonValue;
}

function toJsonValueDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;

  const toJSON = (value as { toJSON?: unknown }).toJSON;
  if (typeof toJSON === 'function') {
    return toJsonValueDeep(toJSON.call(value));
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValueDeep(entry));
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const name = (prototype as { constructor?: { name?: string } })?.constructor?.name ?? '<unknown>';
    throw new Error(`toJsonValue: cannot convert non-POJO value of type ${name}`);
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    result[key] = toJsonValueDeep((value as Record<string, unknown>)[key]);
  }
  return result;
}
