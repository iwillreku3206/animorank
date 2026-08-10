import type { Integer } from '.';
import type { LessThanOperator } from '../../operators/lessThan';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanInteger extends OperatorType<LessThanOperator, Integer> {
  public compare(a: TypeValue<Integer>, b: TypeValue<Integer>): boolean {
    return BigInt(a.value.value) < BigInt(b.value.value);
  }
}
