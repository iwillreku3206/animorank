import type { Integer } from '.';
import type { LessThanEqualOperator } from '../../operators/less_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanEqualInteger extends OperatorType<LessThanEqualOperator, Integer> {
  public compare(expected: TypeValue<Integer>, actual: TypeValue<Integer>): boolean {
    return BigInt(actual.value.value) <= BigInt(expected.value.value);
  }
}
