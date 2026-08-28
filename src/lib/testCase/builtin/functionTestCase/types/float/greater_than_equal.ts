import type { Float } from '.';
import type { GreaterThanEqualOperator } from '../../operators/greater_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanEqualFloat extends OperatorType<GreaterThanEqualOperator, Float> {
  public async compare(expected: TypeValue<Float>, actual: TypeValue<Float>): Promise<boolean> {
    return Number(actual.value.value) >= Number(expected.value.value);
  }
}
