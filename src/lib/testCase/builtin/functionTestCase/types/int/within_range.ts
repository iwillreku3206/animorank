import type { Integer } from '.';
import type { WithinRangeOperator } from '../../operators/within_range';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class WithinRangeInteger extends OperatorType<WithinRangeOperator, Integer> {
  public compare(expected: TypeValue<Integer>, actual: TypeValue<Integer>): boolean {
    const range = Number(this.options.range);
    if (!Number.isInteger(range)) {
      // The schema guarantees a non-negative numeric string, but a
      // fractional range has no defined meaning for an integer comparison —
      // fail loudly with a descriptive error instead of crashing BigInt.
      throw new Error(
        `within_range on an integer comparison requires a whole-number range, got "${this.options.range}"`
      );
    }
    const diff = BigInt(expected.value.value) - BigInt(actual.value.value);
    return (diff < 0n ? -diff : diff) < BigInt(range);
  }
}
