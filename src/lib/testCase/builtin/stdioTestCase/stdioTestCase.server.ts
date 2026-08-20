import type { Problem } from '$lib/problem';
import { ServerTestCase } from '$lib/testCase/testCase.server';
import type { TestCaseLanguageRegistry } from '$lib/testCase/testCaseLanguageRegistry.server';
import type { TestCaseResult } from '$lib/testCase/types';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { StdioTestCase, type StdioTestCaseData, type StdioTestCaseRunInfo } from './stdioTestCase.svelte';
import { StdioTestCaseLanguageRegistry } from './languageRegistry';

export class ServerStdioTestCase extends ServerTestCase<StdioTestCaseData, StdioTestCaseRunInfo> {
  _languageRegistry = new StdioTestCaseLanguageRegistry();
  public get languageRegistry(): TestCaseLanguageRegistry {
    return this._languageRegistry;
  }
  public constructor(model: TestCaseModel, problem: Problem) {
    super(new StdioTestCase(model, problem));
  }
  public static id() {
    return 'stdio';
  }

  public static async create(problem: Problem): Promise<ServerTestCase> {
    const data: StdioTestCaseData = {
      input: '',
      output: ''
    };
    return new ServerStdioTestCase(await ServerTestCase.createModel('stdio', problem, data), problem);
  }

  protected failureResult(error: unknown): TestCaseResult<StdioTestCaseRunInfo> {
    const model = this.testCase.model;
    if (model.public === true) {
      return {
        success: false,
        runInfo: { expected: this.testCase.data.output, actual: '' },
        testCaseInfo: model as TestCaseModel & { public: true },
        compilerOutput: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    return { success: false, testCaseInfo: { public: false } };
  }
}
