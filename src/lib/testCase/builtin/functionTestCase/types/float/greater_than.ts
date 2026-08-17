import type { Float } from '.';
import type { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanFloat extends OperatorType<GreaterThanOperator, Float> {
  public compare(a: TypeValue<Float>, b: TypeValue<Float>): boolean {
    return Number(a.value.value) > Number(b.value.value);
  }
}
