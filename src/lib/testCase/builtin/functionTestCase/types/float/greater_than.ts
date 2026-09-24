import type { Float } from '.';
import type { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanFloat extends OperatorType<GreaterThanOperator, Float> {
  public async compare(expected: TypeValue<Float>, actual: TypeValue<Float>): Promise<boolean> {
    return Number(actual.value.value) > Number(expected.value.value);
  }
}
