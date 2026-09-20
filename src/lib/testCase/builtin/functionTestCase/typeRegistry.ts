import type { IntoJsonValue } from '$lib/types/utils';
import { TypeSchema, type Type } from './type.svelte';
import { ServiceRegistry } from '$lib/registry';
import type z from 'zod';
import { Integer } from './types/int';
import { Float } from './types/float';
import { StringType } from './types/string';
import { Pointer } from './types/pointer';
import { VoidType } from './types/void';
import type { Component, ComponentType } from 'svelte';

export class TypeRegistry extends ServiceRegistry<
  Type,
  [IntoJsonValue],
  // eslint-disable-next-line no-unused-vars
  { create(): Type; id(): string; from?(options: unknown): Promise<Type>; icon?: Component | ComponentType | undefined }
> {
  public id = 'test_case.function.type';

  constructor() {
    super();
    super.register(Integer.id(), Integer);
    super.register(Float.id(), Float);
    super.register(StringType.id(), StringType);
    super.register(Pointer.id(), Pointer);
    super.register(VoidType.id(), VoidType);
  }

  public async from(serialized: z.infer<typeof TypeSchema>): Promise<Type> {
    const cls = await this.getStatic(serialized.type);
    return cls.from ? cls.from(serialized.options) : this.getInstance(serialized.type, serialized.options);
  }
}
