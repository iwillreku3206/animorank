import type { WithinRangeOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { Pointer } from '../../types/pointer';
import { WithinRangeInteger } from '../../types/int/within_range';
import { WithinRangeFloat } from '../../types/float/within_range';
import { WithinRangePointer } from '../../types/pointer/within_range';

export class WithinRangeOperatorTypeRegistry extends OperatorTypeRegistry<WithinRangeOperator> {
  public id = 'test_case.function.operator.within_range.type';

  constructor() {
    super();
    this.registerType(Integer.create(), WithinRangeInteger);
    this.registerType(Float.create(), WithinRangeFloat);
    this.registerType(Pointer.create(), WithinRangePointer);
  }
}
