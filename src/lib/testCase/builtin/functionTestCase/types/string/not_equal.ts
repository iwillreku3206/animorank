import type { StringType } from '.';
import type { NotEqualOperator } from '../../operators/not_equal';
import { OperatorType } from '../../operatorType';
import type { TypeValue } from '../../typeValue.svelte';

export class NotEqualString extends OperatorType<NotEqualOperator, StringType> {
  public async compare(a: TypeValue<StringType>, b: TypeValue<StringType>): Promise<boolean> {
    return a.value.value !== b.value.value;
  }
}
