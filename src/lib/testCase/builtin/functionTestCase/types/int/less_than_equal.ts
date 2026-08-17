import type { Integer } from '.';
import type { LessThanEqualOperator } from '../../operators/less_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanEqualInteger extends OperatorType<LessThanEqualOperator, Integer> {
  public compare(a: TypeValue<Integer>, b: TypeValue<Integer>): boolean {
    return BigInt(a.value.value) <= BigInt(b.value.value);
  }
}
