import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import type { Type } from './type.svelte';
import type { TypeValue } from './typeValue.svelte';
import type { ClassServiceOf } from '$lib/services/registry';
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
  public options: Options = $state() as Options;

  constructor(options: Options) {
    this.options = options;
  }

  public abstract get operatorTypeRegistry(): OperatorTypeRegistry<Operator<Options>>;

  public toJSON() {
    return {
      type: (this.constructor as ClassServiceOf<OperatorRegistry>).id(),
      options: toJsonValue(this.options)
    };
  }

  /**
   * @description Compares two values
   * @param {TypeValue} a The left-value (usually the expected value)
   * @param {TypeValue} b The right-value (usually the actual value)
   */

  public compare<T extends Type>(a: TypeValue<T>, b: TypeValue<T>): boolean {
    if (!deepEqual(a.type.options, b.type.options, { strict: true })) {
      throw new Error('Type options must match');
    }

    const operatorType = this.operatorTypeRegistry.getInstance(
      (a.type.constructor as ClassServiceOf<TypeRegistry>).id(),
      this.options,
      a.type.options
    );

    return operatorType.compare(a, b);
  }
}
