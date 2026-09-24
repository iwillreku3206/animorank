import type { JsonValue } from '@zenstackhq/orm';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import type { Type } from './type.svelte';
import type { ClassServiceOf } from '$lib/registry';
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

  private constructor(type: T, value: JsonValue) {
    this.type = type;
    this.value = value as T extends Type<infer V> ? V : IntoJsonValue;
  }

  /**
   * A value of `type`, checked by the type itself: `validateValue` runs and an
   * invalid value is thrown as the Error it reported. Validation is
   * asynchronous — a pointer validates its target, an array its elements — so a
   * checked value is built by this factory rather than by a constructor, which
   * could only drop the answer on the floor.
   *
   * This is the way in for data from outside: a stored test case, a run result,
   * anything a program printed.
   *
   * @throws the Error `validateValue` returned when `value` is not valid
   */
  public static async create<T extends Type>(type: T, value: JsonValue): Promise<TypeValue<T>> {
    const valid = await type.validateValue(value);
    if (valid !== true) throw valid;
    return new TypeValue(type, value);
  }

  /**
   * A value that is valid by construction — a type's own default, or a value
   * unwrapped from one that was already validated — built without running
   * `validateValue` again.
   *
   * Named rather than a plain constructor so every such site states the
   * assumption it is making; data from outside belongs in
   * {@link create} instead, where the check is what proves the value.
   */
  public static assumedValid<T extends Type>(type: T, value: JsonValue): TypeValue<T> {
    return new TypeValue(type, value);
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
