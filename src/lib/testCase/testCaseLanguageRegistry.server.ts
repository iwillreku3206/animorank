import type { Language } from '$lib/language';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import type { ServerTestCase } from './testCase.server';
import type { TestCaseLanguage } from './testCaseLanguage.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TestCaseLanguageRegistry<TC extends ServerTestCase = any> extends ServiceRegistry<
  TestCaseLanguage<TC>,
  [TC],
  unknown
> {
  constructor() {
    super();
  }

  public registerLanguage(language: Language, testCaseLanguage: ClassServiceOf<this>) {
    this.register(language.id, testCaseLanguage);
  }
}
