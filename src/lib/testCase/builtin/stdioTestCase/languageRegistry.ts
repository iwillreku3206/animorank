import { CLanguage } from '$lib/language/c';
import { TestCaseLanguageRegistry } from '$lib/testCase/testCaseLanguageRegistry.server';
import type { ServerStdioTestCase } from './stdioTestCase.server';
import { CStdioTestCase } from './languages/c/c';

export class StdioTestCaseLanguageRegistry extends TestCaseLanguageRegistry<ServerStdioTestCase> {
  public id = 'test_case.stdio.language';

  constructor() {
    super();
    this.registerLanguage(new CLanguage(), CStdioTestCase);
  }
}
