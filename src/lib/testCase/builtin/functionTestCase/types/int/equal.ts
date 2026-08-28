import type { Integer } from '.';
import type { EqualOperator } from '../../operators/equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class EqualInteger extends OperatorType<EqualOperator, Integer> {
  public async compare(expected: TypeValue<Integer>, actual: TypeValue<Integer>): Promise<boolean> {
    return BigInt(expected.value.value) === BigInt(actual.value.value);
  }
}
