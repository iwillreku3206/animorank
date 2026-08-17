import type { LessThanOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { StringType } from '../../types/string';
import { Pointer } from '../../types/pointer';
import { LessThanInteger } from '../../types/int/less_than';
import { LessThanFloat } from '../../types/float/less_than';
import { LessThanString } from '../../types/string/less_than';
import { LessThanPointer } from '../../types/pointer/less_than';

export class LessThanOperatorTypeRegistry extends OperatorTypeRegistry<LessThanOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), LessThanInteger);
    this.registerType(Float.create(), LessThanFloat);
    this.registerType(StringType.create(), LessThanString);
    this.registerType(Pointer.create(), LessThanPointer);
  }
}
