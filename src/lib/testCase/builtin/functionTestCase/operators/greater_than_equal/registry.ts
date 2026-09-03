import type { GreaterThanEqualOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { Pointer } from '../../types/pointer';
import { GreaterThanEqualInteger } from '../../types/int/greater_than_equal';
import { GreaterThanEqualFloat } from '../../types/float/greater_than_equal';
import { GreaterThanEqualPointer } from '../../types/pointer/greater_than_equal';

export class GreaterThanEqualOperatorTypeRegistry extends OperatorTypeRegistry<GreaterThanEqualOperator> {
  public id = 'test_case.function.operator.greater_than_equal.type';

  constructor() {
    super();
    this.registerType(Integer.create(), GreaterThanEqualInteger);
    this.registerType(Float.create(), GreaterThanEqualFloat);
    this.registerType(Pointer.create(), GreaterThanEqualPointer);
  }
}
