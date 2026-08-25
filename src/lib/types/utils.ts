import type { JsonValue } from '@zenstackhq/orm';

export type IntoJsonValue = string | number | boolean | null | { toJSON(): JsonValue } | IntoJsonObject | IntoJsonArray;

export type IntoJsonObject = {
  [key: string]: IntoJsonValue;
};

export type IntoJsonArray = IntoJsonValue[];

/**
 * Recursively convert a value into a plain JSON value. Objects exposing a
 * `toJSON` method are converted through it; plain objects and arrays are
 * converted member-wise. Values JSON cannot represent faithfully (bigint,
 * undefined, NaN/Infinity, functions, symbols) and circular references are
 * rejected here so they surface at the conversion site instead of at a
 * serialization boundary (e.g. a SvelteKit load function).
 */
export function toJsonValue(value: IntoJsonValue): JsonValue {
  return toJsonValueDeep(value, new Set()) as JsonValue;
}

function toJsonValueDeep(value: unknown, path: Set<object>): unknown {
  if (value === null) return null;

  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('toJsonValue: non-finite numbers (NaN/Infinity) cannot be represented as JSON');
    }
    return value;
  }
  if (typeof value === 'bigint') {
    throw new Error('toJsonValue: cannot convert BigInt; serialize it as a string first');
  }
  if (typeof value === 'undefined') {
    throw new Error('toJsonValue: undefined cannot be represented as JSON');
  }
  if (typeof value !== 'object') {
    throw new Error(`toJsonValue: cannot convert ${typeof value} value`);
  }

  if (path.has(value)) {
    throw new Error('toJsonValue: circular reference detected');
  }

  const toJSON = (value as { toJSON?: unknown }).toJSON;
  if (typeof toJSON === 'function') {
    return toJsonValueDeep(toJSON.call(value), path);
  }

  if (Array.isArray(value)) {
    path.add(value);
    try {
      return value.map((entry) => (entry === undefined ? null : toJsonValueDeep(entry, path)));
    } finally {
      path.delete(value);
    }
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const name = (prototype as { constructor?: { name?: string } })?.constructor?.name ?? '<unknown>';
    throw new Error(`toJsonValue: cannot convert non-POJO value of type ${name}`);
  }

  path.add(value);
  try {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const member = (value as Record<string, unknown>)[key];
      // Optional fields (e.g. id-less parameters) are legitimately undefined;
      // omit them like JSON.stringify does instead of failing the conversion.
      if (member === undefined) continue;
      result[key] = toJsonValueDeep(member, path);
    }
    return result;
  } finally {
    path.delete(value);
  }
}
