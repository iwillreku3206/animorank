import type { JsonValue } from '@zenstackhq/orm';
import { EqualOperator } from '../../operators/equal';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

export class EqualPointer extends OperatorType<EqualOperator, Pointer> {
  public async compare(a: TypeValue<Pointer>, b: TypeValue<Pointer>): Promise<boolean> {
    const innerA = new TypeValue(a.type.targetType, a.value as JsonValue);
    const innerB = new TypeValue(b.type.targetType, b.value as JsonValue);
    return new EqualOperator(this.options).compare(innerA, innerB);
  }
}
