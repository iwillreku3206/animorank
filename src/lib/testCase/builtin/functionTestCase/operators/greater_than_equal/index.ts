import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { GreaterThanEqualOperatorTypeRegistry } from './registry';

export class GreaterThanEqualOperator extends Operator<null> {
  static id(): string {
    return 'greater_than_equal';
  }

  static create(): GreaterThanEqualOperator {
    return new GreaterThanEqualOperator(null);
  }

  public get operatorTypeRegistry(): OperatorTypeRegistry<GreaterThanEqualOperator> {
    return new GreaterThanEqualOperatorTypeRegistry();
  }

  get displayName(): string {
    return '>=';
  }
}
