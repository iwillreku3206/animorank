import { ServiceRegistry } from '$lib/services/registry';
import type { TypeWithValue } from './type';
import { Int } from './type/int';

export class TypeRegistry extends ServiceRegistry<TypeWithValue<any>, []> {
  public getDefault(): TypeWithValue<any> {
    throw new Error('Cannot get default for a type');
  }

  public constructor() {
    super();
    this.register('int', Int);
  }
}
