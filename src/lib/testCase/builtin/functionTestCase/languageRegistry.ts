import { CLanguage } from '$lib/language/c';
import { TestCaseLanguageRegistry } from '$lib/testCase/testCaseLanguageRegistry.server';
import type { ServerFunctionTestCase } from './functionTestCase.server';
import { CFunctionTestCase } from './languages/c/c';

export class FunctionTestCaseLanguageRegistry extends TestCaseLanguageRegistry<ServerFunctionTestCase> {
  constructor() {
    super();
    this.registerLanguage(new CLanguage(), CFunctionTestCase);
  }
}
