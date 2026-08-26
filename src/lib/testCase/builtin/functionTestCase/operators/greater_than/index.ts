import { Operator } from '../../operator.svelte';
import { GreaterThanOperatorTypeRegistry } from './registry';

let typeRegistry: GreaterThanOperatorTypeRegistry | undefined;

export class GreaterThanOperator extends Operator<null> {
  static id(): string {
    return 'greater_than';
  }

  static create(): GreaterThanOperator {
    return new GreaterThanOperator(null);
  }

  // Lazy: the import graph (pointer → global provider → operatorRegistry) is
  // cyclic at module-eval, so construction must wait for first use.
  static get typeRegistry(): GreaterThanOperatorTypeRegistry {
    return (typeRegistry ??= new GreaterThanOperatorTypeRegistry());
  }

  get displayName(): string {
    return '>';
  }
}
