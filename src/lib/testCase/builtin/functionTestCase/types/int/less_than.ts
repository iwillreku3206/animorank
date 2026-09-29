import type { Integer } from '.';
import type { LessThanOperator } from '../../operators/less_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanInteger extends OperatorType<LessThanOperator, Integer> {
  public async compare(expected: TypeValue<Integer>, actual: TypeValue<Integer>): Promise<boolean> {
    return BigInt(actual.value.value) < BigInt(expected.value.value);
  }
}
