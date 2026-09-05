import type { IntoJsonValue } from '$lib/types/utils';
import type { Operator } from './operator.svelte';
import type { Type } from './type.svelte';
import type { TypeValue } from './typeValue.svelte';

export abstract class OperatorType<O extends Operator = Operator, T extends Type = Type> {
  options: O extends Operator<infer Options> ? Options : IntoJsonValue;
  typeOptions: T extends Type<infer Options> ? Options : IntoJsonValue;

  constructor(
    options: O extends Operator<infer Options> ? Options : IntoJsonValue,
    typeOptions: T extends Type<infer Options> ? Options : IntoJsonValue
  ) {
    this.options = options;
    this.typeOptions = typeOptions;
  }

  /**
   * @description Compares two values
   * @param {TypeValue} a The left-value (usually the expected value)
   * @param {TypeValue} b The right-value (usually the actual value)
   */
  // eslint-disable-next-line no-unused-vars
  public abstract compare(a: TypeValue<T>, b: TypeValue<T>): boolean;
}
