import { Operator } from '../../operator.svelte';
import { NotEqualOperatorTypeRegistry } from './registry';

export class NotEqualOperator extends Operator<null> {
  static id(): string {
    return 'not_equal';
  }

  static create(): NotEqualOperator {
    return new NotEqualOperator(null);
  }

  static get typeRegistryClass(): typeof NotEqualOperatorTypeRegistry {
    return NotEqualOperatorTypeRegistry;
  }

  get displayName(): string {
    return '!=';
  }
}
