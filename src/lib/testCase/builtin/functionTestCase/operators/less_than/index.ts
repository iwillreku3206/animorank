import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { LessThanOperatorTypeRegistry } from './registry';

export class LessThanOperator extends Operator<null> {
  static id(): string {
    return 'less_than';
  }

  static create(): LessThanOperator {
    return new LessThanOperator(null);
  }

  public get operatorTypeRegistry(): OperatorTypeRegistry<LessThanOperator> {
    return new LessThanOperatorTypeRegistry();
  }

  get displayName(): string {
    return '<';
  }
}
