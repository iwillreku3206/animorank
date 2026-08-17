import type { JsonValue } from '@zenstackhq/orm';
import { GreaterThanEqualOperator } from '../../operators/greater_than_equal';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

export class GreaterThanEqualPointer extends OperatorType<GreaterThanEqualOperator, Pointer> {
  public compare(a: TypeValue<Pointer>, b: TypeValue<Pointer>): boolean {
    const innerA = new TypeValue(a.type.targetType, a.value as JsonValue);
    const innerB = new TypeValue(b.type.targetType, b.value as JsonValue);
    return new GreaterThanEqualOperator(this.options).compare(innerA, innerB);
  }
}
