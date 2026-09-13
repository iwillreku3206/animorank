import { ServiceRegistry } from '$lib/registry';
import type { Operator } from './operator.svelte';
import type { OperatorType } from './operatorType';

export abstract class OperatorTypeRegistry<Op extends Operator> extends ServiceRegistry<
  OperatorType,
  [Op['options'], any]
> {
  constructor() {
    super();
  }
}
