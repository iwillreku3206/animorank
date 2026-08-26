import { ServiceRegistry, type ClassServiceOf } from '$lib/registry';
import type { Operator } from './operator.svelte';
import type { OperatorType } from './operatorType';
import type { Type } from './type.svelte';
import type { TypeRegistry } from './typeRegistry';

export abstract class OperatorTypeRegistry<Op extends Operator> extends ServiceRegistry<
  OperatorType,
  [Op['options'], any]
> {
  constructor() {
    super();
  }

  public registerType<T extends Type>(type: T, operatorType: ClassServiceOf<typeof this>) {
    this.register((type.constructor as unknown as ClassServiceOf<TypeRegistry>).id(), operatorType);
  }
}
