import type { StringType } from '.';
import type { NotEqualOperator } from '../../operators/not_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class NotEqualString extends OperatorType<NotEqualOperator, StringType> {
  public compare(a: TypeValue<StringType>, b: TypeValue<StringType>): boolean {
    return a.value.value !== b.value.value;
  }
}
