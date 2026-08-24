import { Operator } from '../../operator.svelte';
import { NotEqualOperatorTypeRegistry } from './registry';

export class NotEqualOperator extends Operator<null> {
  static id(): string {
    return 'not_equal';
  }

  static create(): NotEqualOperator {
    return new NotEqualOperator(null);
  }

  static typeRegistry = new NotEqualOperatorTypeRegistry();

  get displayName(): string {
    return '!=';
  }
}
