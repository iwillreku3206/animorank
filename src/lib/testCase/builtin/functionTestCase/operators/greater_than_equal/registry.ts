import type { GreaterThanEqualOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { StringType } from '../../types/string';
import { Pointer } from '../../types/pointer';
import { GreaterThanEqualInteger } from '../../types/int/greater_than_equal';
import { GreaterThanEqualFloat } from '../../types/float/greater_than_equal';
import { GreaterThanEqualString } from '../../types/string/greater_than_equal';
import { GreaterThanEqualPointer } from '../../types/pointer/greater_than_equal';

export class GreaterThanEqualOperatorTypeRegistry extends OperatorTypeRegistry<GreaterThanEqualOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), GreaterThanEqualInteger);
    this.registerType(Float.create(), GreaterThanEqualFloat);
    this.registerType(StringType.create(), GreaterThanEqualString);
    this.registerType(Pointer.create(), GreaterThanEqualPointer);
  }
}
