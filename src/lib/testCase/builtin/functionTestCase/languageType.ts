import type { TestCaseLanguage } from '$lib/testCase/testCaseLanguage.server';
import type { ServerFunctionTestCase } from './functionTestCase.server';
import type { Type } from './type.svelte';

export abstract class LanguageType<L extends TestCaseLanguage<ServerFunctionTestCase>, T extends Type> {
  language: L;
  type: T;

  constructor(language: L, type: T) {
    this.type = type;
    this.language = language;
  }
}
