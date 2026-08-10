import type { IntoJsonValue } from '$lib/types/utils';
import type { Type, TypeSchema } from './type.svelte';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import type z from 'zod';

export class TypeRegistry extends ServiceRegistry<Type, [IntoJsonValue], { create(): Type; id(): string }> {
  private static _instance: TypeRegistry | null;

  public static instance(): TypeRegistry {
    if (!TypeRegistry._instance) {
      TypeRegistry._instance = new TypeRegistry();
    }
    return TypeRegistry._instance;
  }

  private constructor() {
    super();
  }

  public registerType(type: ClassServiceOf<this>): void {
    super.register(type.id(), type);
  }

  public from(serialized: z.infer<typeof TypeSchema>) {
    return this.getInstance(serialized.type, serialized.options);
  }
}
