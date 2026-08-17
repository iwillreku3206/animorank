import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { LessThanEqualOperatorTypeRegistry } from './registry';

export class LessThanEqualOperator extends Operator<null> {
  static id(): string {
    return 'less_than_equal';
  }

  static create(): LessThanEqualOperator {
    return new LessThanEqualOperator(null);
  }

  public get operatorTypeRegistry(): OperatorTypeRegistry<LessThanEqualOperator> {
    return new LessThanEqualOperatorTypeRegistry();
  }

  get displayName(): string {
    return '<=';
  }
}
