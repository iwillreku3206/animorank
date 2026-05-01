import { ServiceRegistry } from '$lib/services/registry';
import type { JsonValue } from '@zenstackhq/orm';
import type { TypeWithValue } from './type';
import { Int } from './type/int';
import { Float } from './type/float';
import { String } from './type/string';

export class TypeRegistry extends ServiceRegistry<TypeWithValue<any>, [JsonValue | undefined]> {
  private static _instance: TypeRegistry | null;

  public static instance(): TypeRegistry {
    if (!TypeRegistry._instance) {
      TypeRegistry._instance = new TypeRegistry();
    }
    return TypeRegistry._instance;
  }

  public getDefault(): TypeWithValue<any> {
    throw new Error('Cannot get default for a type');
  }

  private constructor() {
    super();
    this.register('int', Int);
    this.register('float', Float);
    this.register('string', String);
  }
}
