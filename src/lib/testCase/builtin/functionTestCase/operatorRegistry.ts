import { ServiceRegistry } from '$lib/services/registry';
import { OperatorSchema, type Operator } from './operator.svelte';
import { LessThanOperator } from './operators/lessThan';
import type z from 'zod';

export class OperatorRegistry extends ServiceRegistry<
  Operator,
  [any],
  {
    id(): string;
    create(): Operator;
  }
> {
  private static _instance: OperatorRegistry | null;

  public static instance(): OperatorRegistry {
    if (!OperatorRegistry._instance) {
      OperatorRegistry._instance = new OperatorRegistry();
    }
    return OperatorRegistry._instance;
  }

  private constructor() {
    super();
    this.register('lessThan', LessThanOperator);
  }

  public from(serialized: z.infer<typeof OperatorSchema>) {
    return this.getInstance(serialized.type, serialized.options);
  }
}
