import type { Form, FormValue } from '$lib/form';
import type { JsonValue } from '@zenstackhq/orm';
import type { IntoJsonValue } from '$lib/types/utils';
import type { ValueDisplay, ValueEditor } from './types';
import type { TypeValue } from './typeValue.svelte';
import type { ClassServiceOf } from '$lib/services/registry';
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

  abstract get displayName(): string;

  abstract get optionsForm(): OptionsForm;
  // Typed via `this` (not the raw `Type`) so every subclass's
  // `ValueEditor<this>`/`ValueDisplay<this>` override stays assignable:
  // Svelte's `Component` is invariant in its props, unlike the React
  // `Component` type these were previously declared against.
  abstract get valueForm(): ValueEditor<this>;

  abstract get valueDisplay(): ValueDisplay<this>;
}

export const TypeSchema = z.object({
  type: z.string(),
  options: z.any()
});
