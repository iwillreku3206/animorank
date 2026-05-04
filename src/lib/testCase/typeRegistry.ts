import { ServiceRegistry } from '$lib/services/registry';
import type { JsonValue } from '@zenstackhq/orm';
import { TypeWithValue } from './type';
import { Int } from './type/int';
import { Float } from './type/float';
import { StringType } from './type/string';
import { Pointer } from './type/pointer';
import type { TypeInfo } from './type/typeInfo';

export class TypeRegistry extends ServiceRegistry<
  TypeWithValue<any>,
  [JsonValue | undefined],
  {
    /**
     * Each concrete type class defines its own TypeInfo.
     * This static property is used by the TypePicker to generate forms.
     */
    typeInfo: TypeInfo<any>;
  }
> {
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

  public getTypeList(): string[] {
    return this._registry.keys().toArray();
  }

  private constructor() {
    super();
    this.register('int', Int);
    this.register('float', Float);
    this.register('string', StringType);
    this.register('pointer', Pointer);
  }
}
