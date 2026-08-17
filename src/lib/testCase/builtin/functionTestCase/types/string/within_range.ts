import type { StringType } from '.';
import type { WithinRangeOperator } from '../../operators/within_range';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class WithinRangeString extends OperatorType<WithinRangeOperator, StringType> {
  public compare(a: TypeValue<StringType>, b: TypeValue<StringType>): boolean {
    return Math.abs(a.value.value.length - b.value.value.length) < Number(this.options.range);
  }
}
