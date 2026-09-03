import type { IntoJsonValue } from '$lib/types/utils';
import { TypeSchema, type Type } from './type.svelte';
import { ServiceRegistry, type ClassServiceOf } from '$lib/registry';
import type z from 'zod';
import { Integer } from './types/int';
import { Float } from './types/float';
import { StringType } from './types/string';
import { Pointer } from './types/pointer';
import { VoidType } from './types/void';

export class TypeRegistry extends ServiceRegistry<
  Type,
  [IntoJsonValue],
  { create(): Type; id(): string; from?(options: unknown): Promise<Type> }
> {
  public id = 'test_case.function.type';

  constructor() {
    super();
    this.registerType(Integer);
    this.registerType(Float);
    this.registerType(StringType);
    this.registerType(Pointer);
    this.registerType(VoidType);
  }

  public registerType(type: ClassServiceOf<this>): void {
    super.register(type.id(), type);
  }

  public async from(serialized: z.infer<typeof TypeSchema>): Promise<Type> {
    const cls = await this.getStatic(serialized.type);
    return cls.from ? cls.from(serialized.options) : this.getInstance(serialized.type, serialized.options);
  }
}
