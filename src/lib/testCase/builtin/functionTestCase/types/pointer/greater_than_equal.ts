import type { JsonValue } from '@zenstackhq/orm';
import { GreaterThanEqualOperator } from '../../operators/greater_than_equal';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

/** Compares pointer values by dereferencing through the target type (legacy parity). */
export class GreaterThanEqualPointer extends OperatorType<GreaterThanEqualOperator, Pointer> {
  public compare(expected: TypeValue<Pointer>, actual: TypeValue<Pointer>): boolean {
    const innerExpected = new TypeValue(expected.type.targetType, expected.value as JsonValue);
    const innerActual = new TypeValue(actual.type.targetType, actual.value as JsonValue);
    return new GreaterThanEqualOperator(this.options).compare(innerExpected, innerActual);
  }
}
