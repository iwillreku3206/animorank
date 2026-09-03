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
    this.registerType(Integer.create(), NotEqualInteger);
    this.registerType(Float.create(), NotEqualFloat);
    this.registerType(StringType.create(), NotEqualString);
    this.registerType(Pointer.create(), NotEqualPointer);
  }
}
