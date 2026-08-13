import type { CodeExecutor } from '$lib/executor';
import type { Language } from '$lib/language';
import type { Problem } from '$lib/problem';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import { db } from '$lib/zenstack';
import type { TestCase } from './testCase.svelte';
import type { TestCaseLanguageRegistry } from './testCaseLanguageRegistry.server';
import type { TestCaseResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class ServerTestCase<Data extends IntoJsonValue = any, RunInfo extends IntoJsonValue = any> {
  testCase: TestCase<Data, RunInfo>;

  public abstract get languageRegistry(): TestCaseLanguageRegistry<this>;

  static async createModel(type: string, problem: Problem, data: IntoJsonValue) {
    const model = db.problemTestCase.create({
      data: {
        type,
        data: toJsonValue(data),
        problem_id: problem.id
      }
    });

    return model;
  }

  constructor(testCase: TestCase<Data, RunInfo>) {
    this.testCase = testCase;
  }

  public run(language: Language, executor: CodeExecutor, state: IntoJsonValue): Promise<TestCaseResult<RunInfo>> {
    return this.languageRegistry.getInstance(language.id, this).execute(executor, state);
  }
}
