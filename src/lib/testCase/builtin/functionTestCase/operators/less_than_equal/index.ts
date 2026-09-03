import { Operator } from '../../operator.svelte';
import { LessThanEqualOperatorTypeRegistry } from './registry';

export class LessThanEqualOperator extends Operator<null> {
  static id(): string {
    return 'less_than_equal';
  }

  static create(): LessThanEqualOperator {
    return new LessThanEqualOperator(null);
  }

  static get typeRegistryClass(): typeof LessThanEqualOperatorTypeRegistry {
    return LessThanEqualOperatorTypeRegistry;
  }

  get displayName(): string {
    return '<=';
  }
}
