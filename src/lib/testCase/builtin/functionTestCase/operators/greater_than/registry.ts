import type { GreaterThanOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { StringType } from '../../types/string';
import { Pointer } from '../../types/pointer';
import { GreaterThanInteger } from '../../types/int/greater_than';
import { GreaterThanFloat } from '../../types/float/greater_than';
import { GreaterThanString } from '../../types/string/greater_than';
import { GreaterThanPointer } from '../../types/pointer/greater_than';

export class GreaterThanOperatorTypeRegistry extends OperatorTypeRegistry<GreaterThanOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), GreaterThanInteger);
    this.registerType(Float.create(), GreaterThanFloat);
    this.registerType(StringType.create(), GreaterThanString);
    this.registerType(Pointer.create(), GreaterThanPointer);
  }
}
