import type { JsonValue } from '@zenstackhq/orm';
import { LessThanEqualOperator } from '../../operators/less_than_equal';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

export class LessThanEqualPointer extends OperatorType<LessThanEqualOperator, Pointer> {
  public compare(a: TypeValue<Pointer>, b: TypeValue<Pointer>): boolean {
    const innerA = new TypeValue(a.type.targetType, a.value as JsonValue);
    const innerB = new TypeValue(b.type.targetType, b.value as JsonValue);
    return new LessThanEqualOperator(this.options).compare(innerA, innerB);
  }
}
