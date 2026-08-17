import type { Float } from '.';
import type { NotEqualOperator } from '../../operators/not_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class NotEqualFloat extends OperatorType<NotEqualOperator, Float> {
  public compare(a: TypeValue<Float>, b: TypeValue<Float>): boolean {
    return Number(a.value.value) !== Number(b.value.value);
  }
}
