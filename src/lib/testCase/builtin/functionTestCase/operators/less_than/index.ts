import { Operator } from '../../operator.svelte';
import { LessThanOperatorTypeRegistry } from './registry';

export class LessThanOperator extends Operator<null> {
  static id(): string {
    return 'less_than';
  }

  static create(): LessThanOperator {
    return new LessThanOperator(null);
  }

  static get typeRegistryClass(): typeof LessThanOperatorTypeRegistry {
    return LessThanOperatorTypeRegistry;
  }

  get displayName(): string {
    return '<';
  }
}
