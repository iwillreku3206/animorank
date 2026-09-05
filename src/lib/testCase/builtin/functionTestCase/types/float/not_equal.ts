import type { Float } from '.';
import type { NotEqualOperator } from '../../operators/not_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class NotEqualFloat extends OperatorType<NotEqualOperator, Float> {
  public compare(expected: TypeValue<Float>, actual: TypeValue<Float>): boolean {
    return Number(expected.value.value) !== Number(actual.value.value);
  }
}
