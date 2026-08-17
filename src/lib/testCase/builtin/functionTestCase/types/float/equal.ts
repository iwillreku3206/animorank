import type { Float } from '.';
import type { EqualOperator } from '../../operators/equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class EqualFloat extends OperatorType<EqualOperator, Float> {
  public compare(a: TypeValue<Float>, b: TypeValue<Float>): boolean {
    return Number(a.value.value) === Number(b.value.value);
  }
}
