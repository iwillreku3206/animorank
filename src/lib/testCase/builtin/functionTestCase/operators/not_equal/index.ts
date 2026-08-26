import { Operator } from '../../operator.svelte';
import { NotEqualOperatorTypeRegistry } from './registry';

let typeRegistry: NotEqualOperatorTypeRegistry | undefined;

export class NotEqualOperator extends Operator<null> {
  static id(): string {
    return 'not_equal';
  }

  static create(): NotEqualOperator {
    return new NotEqualOperator(null);
  }

  // Lazy: the import graph (pointer → global provider → operatorRegistry) is
  // cyclic at module-eval, so construction must wait for first use.
  static get typeRegistry(): NotEqualOperatorTypeRegistry {
    return (typeRegistry ??= new NotEqualOperatorTypeRegistry());
  }

  get displayName(): string {
    return '!=';
  }
}
