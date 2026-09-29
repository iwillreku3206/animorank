import type { LessThanOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { Pointer } from '../../types/pointer';
import { LessThanInteger } from '../../types/int/less_than';
import { LessThanFloat } from '../../types/float/less_than';
import { LessThanPointer } from '../../types/pointer/less_than';

export class LessThanOperatorTypeRegistry extends OperatorTypeRegistry<LessThanOperator> {
  public id = 'test_case.function.operator.less_than.type';

  constructor() {
    super();
    super.register(Integer.id(), LessThanInteger);
    super.register(Float.id(), LessThanFloat);
    super.register(Pointer.id(), LessThanPointer);
  }
}
