import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import type { TestCaseLanguage } from '$lib/testCase/testCaseLanguage.server';
import type { ServerFunctionTestCase } from './functionTestCase.server';
import type { LanguageType } from './languageType';
import type { Type } from './type.svelte';
import type { TypeRegistry } from './typeRegistry';

export abstract class LanguageTypeRegistry<
  Language extends TestCaseLanguage<ServerFunctionTestCase>,
  LanguageTypeClass extends LanguageType<Language, Type> = LanguageType<Language, Type>
> extends ServiceRegistry<
  LanguageTypeClass,
  [Language, Type],
  {
    type: ClassServiceOf<TypeRegistry>;
  }
> {
  constructor() {
    super();
  }

  public registerType(type: ClassServiceOf<this>) {
    this.register(type.type.id(), type);
  }
}
