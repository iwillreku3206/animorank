import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import type { Form } from '$lib/form';
import type { Type } from './type.svelte';
import type { TypeValue } from './typeValue.svelte';
import type { ClassServiceOf } from '$lib/registry';
import type { OperatorTypeRegistry } from './operatorTypeRegistry';
import deepEqual from 'deep-equal';
import type { TypeRegistry } from './typeRegistry';
import type { OperatorRegistry } from './operatorRegistry';
import z from 'zod';

export const OperatorSchema = z.object({
  type: z.string(),
  options: z.any()
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class Operator<Options extends IntoJsonValue = any> {
  declare static typeRegistry: OperatorTypeRegistry<Operator>;

  public options: Options = $state() as Options;

  constructor(options: Options) {
    this.options = options;
  }

  public get id(): string {
    return (this.constructor as ClassServiceOf<OperatorRegistry>).id();
  }

  public abstract get displayName(): string;

  /**
   * @description The form to edit this operator's options, or null when the
   * operator has no configurable options.
   */
  get optionsForm(): Form | null {
    return null;
  }

  public toJSON() {
    return {
      type: this.id,
      options: toJsonValue(this.options)
    };
  }

  /**
   * @description Compares two values
   * @param {TypeValue} a The left-value (usually the expected value)
   * @param {TypeValue} b The right-value (usually the actual value)
   */

  public async compare<T extends Type>(a: TypeValue<T>, b: TypeValue<T>): Promise<boolean> {
    if (!deepEqual(a.type.options, b.type.options, { strict: true })) {
      throw new Error('Type options must match');
    }

    const operatorType = await (this.constructor as ClassServiceOf<OperatorRegistry>).typeRegistry.getInstance(
      (a.type.constructor as ClassServiceOf<TypeRegistry>).id(),
      this.options,
      a.type.options
    );

    return operatorType.compare(a, b);
  }
}
