import type { JsonValue } from '@zenstackhq/orm';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import type { Type } from './type.svelte';
import type { ClassServiceOf } from '$lib/services/registry';
import type { TypeRegistry } from './typeRegistry';
import z from 'zod';

export const TypeValueSchema = z.object({
  type: z.string(),
  options: z.any(),
  data: z.any()
});

export class TypeValue<T extends Type = Type> {
  public type: T = $state() as T;
  public value: T extends Type<infer V> ? V : IntoJsonValue = $state() as T extends Type<infer V> ? V : IntoJsonValue;

  constructor(type: T, value: JsonValue) {
    type.validateValue(value);
    this.type = type;
    this.value = value as T extends Type<infer V> ? V : IntoJsonValue;
  }

  public toJSON(): JsonValue {
    const type = (this.type.constructor as ClassServiceOf<TypeRegistry>).id();
    const options = toJsonValue(this.type.options as IntoJsonValue);
    const data = toJsonValue(this.value);
    return { type, options, data };
  }

  public serialize(): string {
    return JSON.stringify(this.value);
  }
}
