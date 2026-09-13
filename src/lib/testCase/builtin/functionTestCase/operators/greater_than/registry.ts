import type { GreaterThanOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { Pointer } from '../../types/pointer';
import { GreaterThanInteger } from '../../types/int/greater_than';
import { GreaterThanFloat } from '../../types/float/greater_than';
import { GreaterThanPointer } from '../../types/pointer/greater_than';

export class GreaterThanOperatorTypeRegistry extends OperatorTypeRegistry<GreaterThanOperator> {
  public id = 'test_case.function.operator.greater_than.type';

  constructor() {
    super();
    super.register(Integer.id(), GreaterThanInteger);
    super.register(Float.id(), GreaterThanFloat);
    super.register(Pointer.id(), GreaterThanPointer);
  }
}
