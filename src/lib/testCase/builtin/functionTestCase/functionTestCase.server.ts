import type { Problem } from '$lib/problem';
import { ServerTestCase } from '$lib/testCase/testCase.server';
import type { TestCaseResult } from '$lib/testCase/types';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import {
  FunctionTestCase,
  getFunctionTestCaseDataSchema,
  type FunctionTestCaseData,
  type FunctionTestCaseRunInfo
} from './functionTestCase.svelte';
import { FunctionTestCaseLanguageRegistry } from './languageRegistry';

export class ServerFunctionTestCase extends ServerTestCase<FunctionTestCaseData, FunctionTestCaseRunInfo> {
  static languageRegistry = new FunctionTestCaseLanguageRegistry();
  public static get dataSchema() {
    return getFunctionTestCaseDataSchema();
  }
  public static async from(model: TestCaseModel, problem: Problem): Promise<ServerFunctionTestCase> {
    return new ServerFunctionTestCase(model, problem, await FunctionTestCase.from(model, problem));
  }

  public constructor(model: TestCaseModel, problem: Problem, testCase?: FunctionTestCase) {
    super(testCase ?? new FunctionTestCase(model, problem));
  }
  public static id() {
    return 'function';
  }

  public static async create(problem: Problem): Promise<ServerTestCase> {
    const data: FunctionTestCaseData = {
      function: '',
      comparisons: [],
      parameters: []
    };
    return new ServerFunctionTestCase(await ServerTestCase.createModel('function', problem, data), problem);
  }

  protected failureResult(error: unknown): TestCaseResult<FunctionTestCaseRunInfo> {
    const model = this.testCase.model;
    if (model.public === true) {
      return {
        success: false,
        runInfo: { comparisons: [] },
        testCaseInfo: model as TestCaseModel & { public: true },
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    return { success: false, testCaseInfo: { public: false } };
  }
}
