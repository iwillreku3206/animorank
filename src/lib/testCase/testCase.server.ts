import type { CodeExecutor } from '$lib/executor';
import type { Language } from '$lib/language';
import type { Problem } from '$lib/problem';
import type { TestCaseLanguage } from './testCaseLanguage.server';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import { db } from '$lib/zenstack';
import type { TestCase } from './testCase.svelte';
import type { TestCaseLanguageRegistry } from './testCaseLanguageRegistry.server';
import type { TestCaseResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class ServerTestCase<Data extends IntoJsonValue = any, RunInfo extends IntoJsonValue = any> {
  // Unparameterized (TC = any): the nominal protected member on ServerTestCase
  // makes TestCaseLanguageRegistry<X> invariant in X, so no concrete registry
  // would be assignable to TestCaseLanguageRegistry<ServerTestCase>. The
  // contract still requires every concrete class to provide the static.
  declare static languageRegistry: TestCaseLanguageRegistry;

  testCase: TestCase<Data, RunInfo>;

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

  public async run(language: Language, executor: CodeExecutor, state: IntoJsonValue): Promise<TestCaseResult<RunInfo>> {
    try {
      const testCaseLanguage = (this.constructor as typeof ServerTestCase).languageRegistry.getInstance(
        language.id,
        this
      );
      return await (testCaseLanguage as TestCaseLanguage<ServerTestCase<Data, RunInfo>>).execute(executor, state);
    } catch (error) {
      return this.failureResult(error);
    }
  }

  /**
   * Build a failed result with a valid (empty) runInfo when execution cannot
   * proceed at all (e.g. missing function definitions, unconfigured executor).
   * Each concrete type owns its RunInfo shape, so the empty form is
   * type-specific; a thrown error must never leak as an invalid runInfo.
   */
  protected abstract failureResult(_error: unknown): TestCaseResult<RunInfo>;
}
