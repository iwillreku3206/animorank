import type { JsonValue } from '@zenstackhq/orm';

export type IntoJsonValue = string | number | boolean | null | { toJSON(): JsonValue } | IntoJsonObject | IntoJsonArray;

export type IntoJsonObject = {
  [key: string]: IntoJsonValue;
};

export type IntoJsonArray = IntoJsonValue[];

export function toJsonValue(value: IntoJsonValue): JsonValue {
  return value !== null && typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function'
    ? value.toJSON()
    : (value as JsonValue);
}
