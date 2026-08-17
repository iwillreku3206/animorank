import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { WithinRangeOperatorTypeRegistry } from './registry';

export class WithinRangeOperator extends Operator<{ range: string }> {
  static id(): string {
    return 'within_range';
  }

  static create(): WithinRangeOperator {
    return new WithinRangeOperator({ range: '0' });
  }

  public get operatorTypeRegistry(): OperatorTypeRegistry<WithinRangeOperator> {
    return new WithinRangeOperatorTypeRegistry();
  }

  get displayName(): string {
    return 'within range';
  }
}
