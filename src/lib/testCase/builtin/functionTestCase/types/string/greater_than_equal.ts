import type { StringType } from '.';
import type { GreaterThanEqualOperator } from '../../operators/greater_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class GreaterThanEqualString extends OperatorType<GreaterThanEqualOperator, StringType> {
  public compare(a: TypeValue<StringType>, b: TypeValue<StringType>): boolean {
    return a.value.value >= b.value.value;
  }
}
