import type { Float } from '.';
import type { LessThanOperator } from '../../operators/less_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanFloat extends OperatorType<LessThanOperator, Float> {
  public compare(a: TypeValue<Float>, b: TypeValue<Float>): boolean {
    return Number(a.value.value) < Number(b.value.value);
  }
}
