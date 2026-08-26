import { Operator } from '../../operator.svelte';
import { GreaterThanEqualOperatorTypeRegistry } from './registry';

let typeRegistry: GreaterThanEqualOperatorTypeRegistry | undefined;

export class GreaterThanEqualOperator extends Operator<null> {
  static id(): string {
    return 'greater_than_equal';
  }

  static create(): GreaterThanEqualOperator {
    return new GreaterThanEqualOperator(null);
  }

  // Lazy: the import graph (pointer → global provider → operatorRegistry) is
  // cyclic at module-eval, so construction must wait for first use.
  static get typeRegistry(): GreaterThanEqualOperatorTypeRegistry {
    return (typeRegistry ??= new GreaterThanEqualOperatorTypeRegistry());
  }

  get displayName(): string {
    return '>=';
  }
}
