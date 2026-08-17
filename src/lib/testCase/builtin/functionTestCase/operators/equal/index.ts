import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { EqualOperatorTypeRegistry } from './registry';

export class EqualOperator extends Operator<null> {
  static id(): string {
    return 'equal';
  }

  static create(): EqualOperator {
    return new EqualOperator(null);
  }

  public get operatorTypeRegistry(): OperatorTypeRegistry<EqualOperator> {
    return new EqualOperatorTypeRegistry();
  }

  get displayName(): string {
    return '=';
  }
}
