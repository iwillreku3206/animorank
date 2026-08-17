import type { JsonValue } from '@zenstackhq/orm';
import { WithinRangeOperator } from '../../operators/within_range';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

export class WithinRangePointer extends OperatorType<WithinRangeOperator, Pointer> {
  public compare(a: TypeValue<Pointer>, b: TypeValue<Pointer>): boolean {
    const innerA = new TypeValue(a.type.targetType, a.value as JsonValue);
    const innerB = new TypeValue(b.type.targetType, b.value as JsonValue);
    return new WithinRangeOperator(this.options).compare(innerA, innerB);
  }
}
