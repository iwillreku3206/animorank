import { ServiceRegistry } from '$lib/services/registry';
import type { IntoJsonValue } from '$lib/types/utils';
import type { Operator } from './operator.svelte';

export class OperatorRegistry extends ServiceRegistry<
  Operator,
  [IntoJsonValue],
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
  }
}
