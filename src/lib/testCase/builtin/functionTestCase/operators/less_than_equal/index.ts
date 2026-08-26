import { Operator } from '../../operator.svelte';
import { LessThanEqualOperatorTypeRegistry } from './registry';

let typeRegistry: LessThanEqualOperatorTypeRegistry | undefined;

export class LessThanEqualOperator extends Operator<null> {
  static id(): string {
    return 'less_than_equal';
  }

  static create(): LessThanEqualOperator {
    return new LessThanEqualOperator(null);
  }

  // Lazy: the import graph (pointer → global provider → operatorRegistry) is
  // cyclic at module-eval, so construction must wait for first use.
  static get typeRegistry(): LessThanEqualOperatorTypeRegistry {
    return (typeRegistry ??= new LessThanEqualOperatorTypeRegistry());
  }

  get displayName(): string {
    return '<=';
  }
}
