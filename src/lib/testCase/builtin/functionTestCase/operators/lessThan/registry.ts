import type { LessThanOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { Integer } from '../../types/int';
import { LessThanInteger } from '../../types/int/lessThan';

export class LessThanOperatorTypeRegistry extends OperatorTypeRegistry<LessThanOperator> {
  constructor() {
    super();
    this.registerType(Integer.create(), LessThanInteger);
  }
}
