import type { Integer } from '.';
import type { NotEqualOperator } from '../../operators/not_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class NotEqualInteger extends OperatorType<NotEqualOperator, Integer> {
  public async compare(expected: TypeValue<Integer>, actual: TypeValue<Integer>): Promise<boolean> {
    return BigInt(expected.value.value) !== BigInt(actual.value.value);
  }
}
