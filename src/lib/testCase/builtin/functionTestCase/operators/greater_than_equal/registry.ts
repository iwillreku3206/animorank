import type { GreaterThanEqualOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { Float } from '../../types/float';
import { GreaterThanEqualInteger } from '../../types/int/greater_than_equal';
import { GreaterThanEqualFloat } from '../../types/float/greater_than_equal';

export class GreaterThanEqualOperatorTypeRegistry extends OperatorTypeRegistry<GreaterThanEqualOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), GreaterThanEqualInteger);
    this.registerType(Float.create(), GreaterThanEqualFloat);
  }
}
