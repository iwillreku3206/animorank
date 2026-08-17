import type { StringType } from '.';
import type { GreaterThanOperator } from '../../operators/greater_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanString extends OperatorType<GreaterThanOperator, StringType> {
  public compare(a: TypeValue<StringType>, b: TypeValue<StringType>): boolean {
    return a.value.value > b.value.value;
  }
}
