import type { JsonValue } from '@zenstackhq/orm';
import { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

export class GreaterThanPointer extends OperatorType<GreaterThanOperator, Pointer> {
  public compare(a: TypeValue<Pointer>, b: TypeValue<Pointer>): boolean {
    const innerA = new TypeValue(a.type.targetType, a.value as JsonValue);
    const innerB = new TypeValue(b.type.targetType, b.value as JsonValue);
    return new GreaterThanOperator(this.options).compare(innerA, innerB);
  }
}
