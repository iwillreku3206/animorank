import type { NotEqualOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { StringType } from '../../types/string';
import { Pointer } from '../../types/pointer';
import { NotEqualInteger } from '../../types/int/not_equal';
import { NotEqualFloat } from '../../types/float/not_equal';
import { NotEqualString } from '../../types/string/not_equal';
import { NotEqualPointer } from '../../types/pointer/not_equal';

export class NotEqualOperatorTypeRegistry extends OperatorTypeRegistry<NotEqualOperator> {
  public id = 'test_case.function.operator.not_equal.type';

  constructor() {
    super();
    super.register(Integer.id(), NotEqualInteger);
    super.register(Float.id(), NotEqualFloat);
    super.register(StringType.id(), NotEqualString);
    super.register(Pointer.id(), NotEqualPointer);
  }
}
