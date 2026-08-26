import { Operator } from '../../operator.svelte';
import { LessThanOperatorTypeRegistry } from './registry';

let typeRegistry: LessThanOperatorTypeRegistry | undefined;

export class LessThanOperator extends Operator<null> {
  static id(): string {
    return 'less_than';
  }

  static create(): LessThanOperator {
    return new LessThanOperator(null);
  }

  // Lazy: the import graph (pointer → global provider → operatorRegistry) is
  // cyclic at module-eval, so construction must wait for first use.
  static get typeRegistry(): LessThanOperatorTypeRegistry {
    return (typeRegistry ??= new LessThanOperatorTypeRegistry());
  }

  get displayName(): string {
    return '<';
  }
}
