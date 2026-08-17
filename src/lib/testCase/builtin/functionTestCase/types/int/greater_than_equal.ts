import type { Integer } from '.';
import type { GreaterThanEqualOperator } from '../../operators/greater_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanEqualInteger extends OperatorType<GreaterThanEqualOperator, Integer> {
  public compare(a: TypeValue<Integer>, b: TypeValue<Integer>): boolean {
    return BigInt(a.value.value) >= BigInt(b.value.value);
  }
}
