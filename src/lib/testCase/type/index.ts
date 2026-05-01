import type { LanguageRegistry } from '../languageRegistry';
import type { LanguageType } from './languageType';

export abstract class TypeWithValue<T> {
  public value: T;
  protected languageRegistry: LanguageRegistry<T>;

  constructor(value: T, languageRegistry: LanguageRegistry<T>) {
    this.value = value;
    this.languageRegistry = languageRegistry;
  }

  public getLanguage(language: string) {
    return this.languageRegistry.getInstance(language, this);
  }
}
