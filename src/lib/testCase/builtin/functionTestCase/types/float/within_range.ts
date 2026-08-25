import type { Float } from '.';
import type { WithinRangeOperator } from '../../operators/within_range';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class WithinRangeFloat extends OperatorType<WithinRangeOperator, Float> {
  public compare(expected: TypeValue<Float>, actual: TypeValue<Float>): boolean {
    return Math.abs(Number(expected.value.value) - Number(actual.value.value)) < Number(this.options.range);
  }
}
