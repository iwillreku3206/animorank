import { Operator } from '../../operator.svelte';
import type { OperatorTypeRegistry } from '../../operatorTypeRegistry';
import { LessThanOperatorTypeRegistry } from './registry';

export class LessThanOperator extends Operator<null> {
  public get operatorTypeRegistry(): OperatorTypeRegistry<LessThanOperator> {
    return new LessThanOperatorTypeRegistry();
  }
}
