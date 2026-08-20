import { CLanguage } from '$lib/language/c';
import { TestCaseLanguageRegistry } from '$lib/testCase/testCaseLanguageRegistry.server';
import type { ServerStdioTestCase } from './stdioTestCase.server';
import { CStdioTestCase } from './languages/c/c';

export class StdioTestCaseLanguageRegistry extends TestCaseLanguageRegistry<ServerStdioTestCase> {
  constructor() {
    super();
    this.registerLanguage(new CLanguage(), CStdioTestCase);
  }
}
