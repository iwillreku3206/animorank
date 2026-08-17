import type { WithinRangeOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { StringType } from '../../types/string';
import { Pointer } from '../../types/pointer';
import { WithinRangeInteger } from '../../types/int/within_range';
import { WithinRangeFloat } from '../../types/float/within_range';
import { WithinRangeString } from '../../types/string/within_range';
import { WithinRangePointer } from '../../types/pointer/within_range';

export class WithinRangeOperatorTypeRegistry extends OperatorTypeRegistry<WithinRangeOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), WithinRangeInteger);
    this.registerType(Float.create(), WithinRangeFloat);
    this.registerType(StringType.create(), WithinRangeString);
    this.registerType(Pointer.create(), WithinRangePointer);
  }
}
