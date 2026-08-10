import { ServiceRegistry } from '$lib/services/registry';
import type { TypeWithValue } from './type';
import type { LanguageType } from './type/languageType';

export class LanguageRegistry<T> extends ServiceRegistry<LanguageType<T>, [TypeWithValue<T>]> {
  public getDefault(): LanguageType<T> {
    throw new Error('Cannot get default for a type');
  }

  public constructor() {
    super();
  }
}
