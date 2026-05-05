import type z from 'zod';
import type { TypeInfo } from './typeInfo';
import type { JsonValue } from '@zenstackhq/orm';
import type { LanguageRegistry } from '../languageRegistry';
import type { LanguageType } from './languageType';

/**
 * Base abstract class for all types. Each concrete type adds static
 * TypeInfo (form sections, icon, nestability) and a value schema.
 */
export abstract class TypeWithValue<T> {
  public value: T;
  protected languageRegistry: LanguageRegistry<T>;

  constructor(value: T, languageRegistry: LanguageRegistry<T>) {
    this.value = value;
    this.languageRegistry = languageRegistry;
  }

  static valueSchema: z.ZodType;

  public getLanguage(language: string): LanguageType<T> {
    return this.languageRegistry.getInstance(language, this);
  }

  public abstract toString(): string;
}
