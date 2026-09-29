import { Operator } from '../../operator.svelte';
import { GreaterThanOperatorTypeRegistry } from './registry';

export class GreaterThanOperator extends Operator<null> {
  static id(): string {
    return 'greater_than';
  }

  static create(): GreaterThanOperator {
    return new GreaterThanOperator(null);
  }

  static get typeRegistryClass(): typeof GreaterThanOperatorTypeRegistry {
    return GreaterThanOperatorTypeRegistry;
  }

  get displayName(): string {
    return '>';
  }
}
