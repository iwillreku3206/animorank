import type { Float } from '.';
import type { GreaterThanEqualOperator } from '../../operators/greater_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanEqualFloat extends OperatorType<GreaterThanEqualOperator, Float> {
  public compare(a: TypeValue<Float>, b: TypeValue<Float>): boolean {
    return Number(a.value.value) >= Number(b.value.value);
  }
}
