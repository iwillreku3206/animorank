import type { Float } from '.';
import type { LessThanOperator } from '../../operators/less_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanFloat extends OperatorType<LessThanOperator, Float> {
  public async compare(expected: TypeValue<Float>, actual: TypeValue<Float>): Promise<boolean> {
    return Number(actual.value.value) < Number(expected.value.value);
  }
}
