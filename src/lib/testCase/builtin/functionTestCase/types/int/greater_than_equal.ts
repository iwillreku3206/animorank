import type { Integer } from '.';
import type { GreaterThanEqualOperator } from '../../operators/greater_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanEqualInteger extends OperatorType<GreaterThanEqualOperator, Integer> {
  public compare(expected: TypeValue<Integer>, actual: TypeValue<Integer>): boolean {
    return BigInt(actual.value.value) >= BigInt(expected.value.value);
  }
}
