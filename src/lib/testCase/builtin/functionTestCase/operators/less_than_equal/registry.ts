import type { LessThanEqualOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { StringType } from '../../types/string';
import { Pointer } from '../../types/pointer';
import { LessThanEqualInteger } from '../../types/int/less_than_equal';
import { LessThanEqualFloat } from '../../types/float/less_than_equal';
import { LessThanEqualString } from '../../types/string/less_than_equal';
import { LessThanEqualPointer } from '../../types/pointer/less_than_equal';

export class LessThanEqualOperatorTypeRegistry extends OperatorTypeRegistry<LessThanEqualOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), LessThanEqualInteger);
    this.registerType(Float.create(), LessThanEqualFloat);
    this.registerType(StringType.create(), LessThanEqualString);
    this.registerType(Pointer.create(), LessThanEqualPointer);
  }
}
