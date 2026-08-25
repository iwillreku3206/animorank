import type { Problem } from '$lib/problem';
import { ServerTestCase } from '$lib/testCase/testCase.server';
import type { TestCaseResult } from '$lib/testCase/types';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import {
  CustomTestCase,
  CustomTestCaseDataSchema,
  type CustomTestCaseData,
  type CustomTestCaseRunInfo
} from './customTestCase.svelte';
import { CustomTestCaseLanguageRegistry } from './languageRegistry';

export class ServerCustomTestCase extends ServerTestCase<CustomTestCaseData, CustomTestCaseRunInfo> {
  static languageRegistry = new CustomTestCaseLanguageRegistry();
  public static dataSchema = CustomTestCaseDataSchema;
  public constructor(model: TestCaseModel, problem: Problem) {
    super(new CustomTestCase(model, problem));
  }
  public static id() {
    return 'custom';
  }

  public static async create(problem: Problem): Promise<ServerTestCase> {
    const data: CustomTestCaseData = {
      test_code: ''
    };
    return new ServerCustomTestCase(await ServerTestCase.createModel('custom', problem, data), problem);
  }

  protected failureResult(error: unknown): TestCaseResult<CustomTestCaseRunInfo> {
    const model = this.testCase.model;
    if (model.public === true) {
      return {
        success: false,
        runInfo: { exitCode: 1, stderr: '' },
        testCaseInfo: model as TestCaseModel & { public: true },
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    return { success: false, testCaseInfo: { public: false } };
  }
}
