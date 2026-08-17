import type { StringType } from '.';
import type { LessThanOperator } from '../../operators/less_than';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class LessThanString extends OperatorType<LessThanOperator, StringType> {
  public compare(a: TypeValue<StringType>, b: TypeValue<StringType>): boolean {
    return a.value.value < b.value.value;
  }
}
