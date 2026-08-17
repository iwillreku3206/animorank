import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { GreaterThanOperatorTypeRegistry } from './registry';

export class GreaterThanOperator extends Operator<null> {
  static id(): string {
    return 'greater_than';
  }

  static create(): GreaterThanOperator {
    return new GreaterThanOperator(null);
  }

  public get operatorTypeRegistry(): OperatorTypeRegistry<GreaterThanOperator> {
    return new GreaterThanOperatorTypeRegistry();
  }

  get displayName(): string {
    return '>';
  }
}
