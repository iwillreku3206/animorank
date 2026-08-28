import type { JsonValue } from '@zenstackhq/orm';
import { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

/** Compares pointer values by dereferencing through the target type (legacy parity). */
export class GreaterThanPointer extends OperatorType<GreaterThanOperator, Pointer> {
  public async compare(expected: TypeValue<Pointer>, actual: TypeValue<Pointer>): Promise<boolean> {
    const innerExpected = new TypeValue(expected.type.targetType, expected.value as JsonValue);
    const innerActual = new TypeValue(actual.type.targetType, actual.value as JsonValue);
    return new GreaterThanOperator(this.options).compare(innerExpected, innerActual);
  }
}
