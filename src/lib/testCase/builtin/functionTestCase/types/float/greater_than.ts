import type { Float } from '.';
import type { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanFloat extends OperatorType<GreaterThanOperator, Float> {
  public compare(expected: TypeValue<Float>, actual: TypeValue<Float>): boolean {
    return Number(actual.value.value) > Number(expected.value.value);
  }
}
