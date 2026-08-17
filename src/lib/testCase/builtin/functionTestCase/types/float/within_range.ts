import type { Float } from '.';
import type { WithinRangeOperator } from '../../operators/within_range';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class WithinRangeFloat extends OperatorType<WithinRangeOperator, Float> {
  public compare(a: TypeValue<Float>, b: TypeValue<Float>): boolean {
    return Math.abs(Number(a.value.value) - Number(b.value.value)) < Number(this.options.range);
  }
}
