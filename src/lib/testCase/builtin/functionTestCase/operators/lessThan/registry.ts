import type { LessThanOperator } from '.';
import { OperatorTypeRegistry } from '../../operatorTypeRegistry';

export class LessThanOperatorTypeRegistry extends OperatorTypeRegistry<LessThanOperator> {
  constructor() {
    super();
  }
}
