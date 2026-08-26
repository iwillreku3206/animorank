import { Operator } from '../../operator.svelte';
import { EqualOperatorTypeRegistry } from './registry';

let typeRegistry: EqualOperatorTypeRegistry | undefined;

export class EqualOperator extends Operator<null> {
  static id(): string {
    return 'equal';
  }

  static create(): EqualOperator {
    return new EqualOperator(null);
  }

  // Lazy: the import graph (pointer → global provider → operatorRegistry) is
  // cyclic at module-eval, so construction must wait for first use.
  static get typeRegistry(): EqualOperatorTypeRegistry {
    return (typeRegistry ??= new EqualOperatorTypeRegistry());
  }

  get displayName(): string {
    return '=';
  }
}
