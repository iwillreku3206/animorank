import { Operator } from '../../operator.svelte';
import { GreaterThanEqualOperatorTypeRegistry } from './registry';

export class GreaterThanEqualOperator extends Operator<null> {
  static id(): string {
    return 'greater_than_equal';
  }

  static create(): GreaterThanEqualOperator {
    return new GreaterThanEqualOperator(null);
  }

  static typeRegistry = new GreaterThanEqualOperatorTypeRegistry();

  get displayName(): string {
    return '>=';
  }
}
