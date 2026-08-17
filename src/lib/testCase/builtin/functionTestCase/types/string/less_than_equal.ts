import type { StringType } from '.';
import type { LessThanEqualOperator } from '../../operators/less_than_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanEqualString extends OperatorType<LessThanEqualOperator, StringType> {
  public compare(a: TypeValue<StringType>, b: TypeValue<StringType>): boolean {
    return a.value.value <= b.value.value;
  }
}
