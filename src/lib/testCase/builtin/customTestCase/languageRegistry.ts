import { CLanguage } from '$lib/language/c';
import { TestCaseLanguageRegistry } from '$lib/testCase/testCaseLanguageRegistry.server';
import type { ServerCustomTestCase } from './customTestCase.server';
import { CCustomTestCase } from './languages/c/c';

export class CustomTestCaseLanguageRegistry extends TestCaseLanguageRegistry<ServerCustomTestCase> {
  constructor() {
    super();
    this.registerLanguage(new CLanguage(), CCustomTestCase);
  }
}
