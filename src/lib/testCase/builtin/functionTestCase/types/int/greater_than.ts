import type { Integer } from '.';
import type { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanInteger extends OperatorType<GreaterThanOperator, Integer> {
  public async compare(expected: TypeValue<Integer>, actual: TypeValue<Integer>): Promise<boolean> {
    return BigInt(actual.value.value) > BigInt(expected.value.value);
  }
}
