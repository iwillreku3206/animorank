import type { Float } from '.';
import type { LessThanEqualOperator } from '../../operators/less_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanEqualFloat extends OperatorType<LessThanEqualOperator, Float> {
  public compare(a: TypeValue<Float>, b: TypeValue<Float>): boolean {
    return Number(a.value.value) <= Number(b.value.value);
  }
}
