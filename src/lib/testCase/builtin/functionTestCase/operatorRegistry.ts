import { ServiceRegistry } from '$lib/registry';
import { OperatorSchema, type Operator } from './operator.svelte';
import type { OperatorTypeRegistry } from './operatorTypeRegistry';
import { LessThanOperator } from './operators/less_than';
import { LessThanEqualOperator } from './operators/less_than_equal';
import { GreaterThanOperator } from './operators/greater_than';
import { GreaterThanEqualOperator } from './operators/greater_than_equal';
import { EqualOperator } from './operators/equal';
import { NotEqualOperator } from './operators/not_equal';
import { WithinRangeOperator } from './operators/within_range';
import type z from 'zod';

export class OperatorRegistry extends ServiceRegistry<
  Operator,
  [any],
  {
    id(): string;
    create(): Operator;
    typeRegistry: OperatorTypeRegistry<Operator>;
  }
> {
  constructor() {
    super();
    this.register('less_than', LessThanOperator);
    this.register('less_than_equal', LessThanEqualOperator);
    this.register('greater_than', GreaterThanOperator);
    this.register('greater_than_equal', GreaterThanEqualOperator);
    this.register('equal', EqualOperator);
    this.register('not_equal', NotEqualOperator);
    this.register('within_range', WithinRangeOperator);
  }

  public from(serialized: z.infer<typeof OperatorSchema>) {
    return this.getInstance(serialized.type, serialized.options);
  }
}
