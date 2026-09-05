import type { Float } from '.';
import type { EqualOperator } from '../../operators/equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class EqualFloat extends OperatorType<EqualOperator, Float> {
  public compare(expected: TypeValue<Float>, actual: TypeValue<Float>): boolean {
    return Number(expected.value.value) === Number(actual.value.value);
  }
}
