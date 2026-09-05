import type { EqualOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { StringType } from '../../types/string';
import { Pointer } from '../../types/pointer';
import { EqualInteger } from '../../types/int/equal';
import { EqualFloat } from '../../types/float/equal';
import { EqualString } from '../../types/string/equal';
import { EqualPointer } from '../../types/pointer/equal';

export class EqualOperatorTypeRegistry extends OperatorTypeRegistry<EqualOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), EqualInteger);
    this.registerType(Float.create(), EqualFloat);
    this.registerType(StringType.create(), EqualString);
    this.registerType(Pointer.create(), EqualPointer);
  }
}
