import type { Integer } from '.';
import type { NotEqualOperator } from '../../operators/not_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class NotEqualInteger extends OperatorType<NotEqualOperator, Integer> {
  public compare(a: TypeValue<Integer>, b: TypeValue<Integer>): boolean {
    return BigInt(a.value.value) !== BigInt(b.value.value);
  }
}
