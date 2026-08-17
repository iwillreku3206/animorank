import type { StringType } from '.';
import type { EqualOperator } from '../../operators/equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class EqualString extends OperatorType<EqualOperator, StringType> {
  public compare(a: TypeValue<StringType>, b: TypeValue<StringType>): boolean {
    return a.value.value === b.value.value;
  }
}
