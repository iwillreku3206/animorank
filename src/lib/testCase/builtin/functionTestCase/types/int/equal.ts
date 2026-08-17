import type { Integer } from '.';
import type { EqualOperator } from '../../operators/equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class EqualInteger extends OperatorType<EqualOperator, Integer> {
  public compare(a: TypeValue<Integer>, b: TypeValue<Integer>): boolean {
    return BigInt(a.value.value) === BigInt(b.value.value);
  }
}
