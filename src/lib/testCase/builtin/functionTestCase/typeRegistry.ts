import type { IntoJsonValue } from '$lib/types/utils';
import { TypeSchema, type Type } from './type.svelte';
import { ServiceRegistry, type ClassServiceOf } from '$lib/registry';
import type z from 'zod';
import { Integer } from './types/int';
import { Float } from './types/float';
import { StringType } from './types/string';
import { Pointer } from './types/pointer';
import { VoidType } from './types/void';

export class TypeRegistry extends ServiceRegistry<Type, [IntoJsonValue], { create(): Type; id(): string }> {
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

  public from(serialized: z.infer<typeof TypeSchema>) {
    return this.getInstance(serialized.type, serialized.options);
  }
}
