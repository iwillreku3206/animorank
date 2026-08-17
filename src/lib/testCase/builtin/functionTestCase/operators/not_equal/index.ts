import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { NotEqualOperatorTypeRegistry } from './registry';

export class NotEqualOperator extends Operator<null> {
  static id(): string {
    return 'not_equal';
  }

  static create(): NotEqualOperator {
    return new NotEqualOperator(null);
  }

  public get operatorTypeRegistry(): OperatorTypeRegistry<NotEqualOperator> {
    return new NotEqualOperatorTypeRegistry();
  }

  get displayName(): string {
    return '!=';
  }
}
