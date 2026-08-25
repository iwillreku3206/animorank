import type { JsonValue } from '@zenstackhq/orm';
import { LessThanEqualOperator } from '../../operators/less_than_equal';
import { OperatorType } from '../../operatorType';
import { TypeValue } from '../../typeValue.svelte';
import type { Pointer } from '.';

/** Compares pointer values by dereferencing through the target type (legacy parity). */
export class LessThanEqualPointer extends OperatorType<LessThanEqualOperator, Pointer> {
  public compare(expected: TypeValue<Pointer>, actual: TypeValue<Pointer>): boolean {
    const innerExpected = new TypeValue(expected.type.targetType, expected.value as JsonValue);
    const innerActual = new TypeValue(actual.type.targetType, actual.value as JsonValue);
    return new LessThanEqualOperator(this.options).compare(innerExpected, innerActual);
  }
}
