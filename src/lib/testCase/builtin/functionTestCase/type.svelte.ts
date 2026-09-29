import type { ComponentType } from 'svelte';
import type { Form, FormValue } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import type { IntoJsonValue } from '$lib/types/utils';
import type { ValueDisplay, ValueEditor } from './types';
import type { TypeValue } from './typeValue.svelte';
import type { ClassServiceOf } from '$lib/registry';
import type { TypeRegistry } from './typeRegistry';
import z from 'zod';

/**
 * @description Defines a data type
 */
export abstract class Type<
  // Not specifying a generic means that we do not really care specifically about the inner value of the type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Value extends IntoJsonValue = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OptionsForm extends Form = any,
  Options extends FormValue<OptionsForm> = FormValue<OptionsForm>
> {
  declare private readonly $inferValue: Value;
  public options: Options = $state() as Options;

  public get id(): string {
    return (this.constructor as ClassServiceOf<TypeRegistry>).id();
  }

  /**
   * @param {Options} options The options for the type.
   */
  constructor(options: Options) {
    this.options = options;
  }

  toJSON() {
    return {
      type: this.id,
      options: this.options
    };
  }

  /**
   * @description Whether this type represents the absence of a value. The
   *   void type stubs this to `true`; every value type inherits `false`.
   *   Callers use this instead of comparing type ids, so void-ness lives in
   *   the type implementation.
   */
  public get isVoid(): boolean {
    return false;
  }

  /**
   * @description A function that validates the value for the type
   * @returns `true` if the data is valid, `Error` otherwise
   */
  // eslint-disable-next-line no-unused-vars
  public abstract validateValue(data: JsonValue): Promise<true | Error>;

  public abstract defaultValue(): TypeValue<this>;

  /**
   * @description The type's unchanging name: the static half of
   *   {@link displayName}, e.g. `int`. Two instances of the same type always
   *   share it, so it is what a label prefix, a filter or an icon keys off.
   */
  public abstract get staticName(): string;

  /**
   * @description What the type concretely is with its current options: the
   *   parenthesised half of {@link displayName}, e.g. `int32` for an int or
   *   `float64` for a float. Derived types compose it from their options, so a
   *   pointer to an int reads `int32*`.
   */
  public abstract get detailedName(): string;

  /**
   * @description The label every type is listed under: its static name, then
   *   the detailed one in parentheses — `int (int32)`, `float (float32)`.
   *   Lowercase throughout, because these are type names (like the C
   *   declarations they stand for), not prose.
   */
  public get displayName(): string {
    return `${this.staticName} (${this.detailedName})`;
  }

  /**
   * @description The icon shown wherever types are listed. Optional: a type
   *   that declares none is listed by name alone. Static, because an icon
   *   describes the type itself, not its options.
   */
  declare static icon?: ComponentType;

  abstract get optionsForm(): OptionsForm;

  abstract get valueForm(): ValueEditor;

  abstract get valueDisplay(): ValueDisplay;
}

export const TypeSchema = z.object({
  type: z.string(),
  options: z.any()
});
