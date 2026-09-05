import { Operator } from '../../operator.svelte';
import { EqualOperatorTypeRegistry } from './registry';

export class EqualOperator extends Operator<null> {
  static id(): string {
    return 'equal';
  }

  static create(): EqualOperator {
    return new EqualOperator(null);
  }

  static typeRegistry = new EqualOperatorTypeRegistry();

  get displayName(): string {
    return '=';
  }
}
