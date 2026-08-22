import type { LessThanOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { LessThanInteger } from '../../types/int/less_than';
import { LessThanFloat } from '../../types/float/less_than';

export class LessThanOperatorTypeRegistry extends OperatorTypeRegistry<LessThanOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), LessThanInteger);
    this.registerType(Float.create(), LessThanFloat);
  }
}
