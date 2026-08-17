import type { Integer } from '.';
import type { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanInteger extends OperatorType<GreaterThanOperator, Integer> {
  public compare(a: TypeValue<Integer>, b: TypeValue<Integer>): boolean {
    return BigInt(a.value.value) > BigInt(b.value.value);
  }
}
