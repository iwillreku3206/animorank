import type { Problem } from '$lib/problem';
import { ServerTestCase } from '$lib/testCase/testCase.server';
import type { TestCaseLanguageRegistry } from '$lib/testCase/testCaseLanguageRegistry.server';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { FunctionTestCase, type FunctionTestCaseData, type FunctionTestCaseRunInfo } from './functionTestCase.svelte';
import { FunctionTestCaseLanguageRegistry } from './languageRegistry';

export class ServerFunctionTestCase extends ServerTestCase<FunctionTestCaseData, FunctionTestCaseRunInfo> {
  _languageRegistry = new FunctionTestCaseLanguageRegistry();
  public get languageRegistry(): TestCaseLanguageRegistry {
    return this._languageRegistry;
  }
  private constructor(model: TestCaseModel, problem: Problem) {
    super(new FunctionTestCase(model, problem));
  }
  public static id() {
    return 'function';
  }

  public async create(problem: Problem): Promise<ServerTestCase> {
    const data: FunctionTestCaseData = {
      function: '',
      comparisons: [],
      parameters: []
    };
    return new ServerFunctionTestCase(await ServerTestCase.create('function', problem, data), problem);
  }
}
