import type { Float } from '.';
import type { LessThanEqualOperator } from '../../operators/less_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanEqualFloat extends OperatorType<LessThanEqualOperator, Float> {
  public compare(expected: TypeValue<Float>, actual: TypeValue<Float>): boolean {
    return Number(actual.value.value) <= Number(expected.value.value);
  }
}
