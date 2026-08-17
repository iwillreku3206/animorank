import type { Integer } from '.';
import type { WithinRangeOperator } from '../../operators/within_range';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class WithinRangeInteger extends OperatorType<WithinRangeOperator, Integer> {
  public compare(a: TypeValue<Integer>, b: TypeValue<Integer>): boolean {
    const diff = BigInt(a.value.value) - BigInt(b.value.value);
    return (diff < 0n ? -diff : diff) < BigInt(this.options.range);
  }
}
