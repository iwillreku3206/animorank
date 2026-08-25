import type { CodeExecutor } from '$lib/executor';
import type { Language } from '$lib/language';
import type { Problem } from '$lib/problem';
import type { TestCaseLanguage } from './testCaseLanguage.server';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';
import { db } from '$lib/zenstack';
import type { TestCase } from './testCase.svelte';
import type { TestCaseLanguageRegistry } from './testCaseLanguageRegistry.server';
import type { TestCaseResult } from './types';
import type z from 'zod';

/** The subset of an update payload that concerns the test case row itself. */
export interface TestCaseUpdateOptions {
  type?: string;
  public?: unknown;
  data?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class ServerTestCase<Data extends IntoJsonValue = any, RunInfo extends IntoJsonValue = any> {
  // Unparameterized (TC = any): the nominal protected member on ServerTestCase
  // makes TestCaseLanguageRegistry<X> invariant in X, so no concrete registry
  // would be assignable to TestCaseLanguageRegistry<ServerTestCase>. The
  // contract still requires every concrete class to provide the static.
  declare static languageRegistry: TestCaseLanguageRegistry;
  declare static id: () => string;
  declare static dataSchema: z.ZodType;

  /**
   * Validate an update payload for this test case type before it is written.
   * The shared rules live here (public must be boolean; changing the type
   * requires data so a cross-type update can never write an unparseable row);
   * the type-specific data check runs against the class's own `dataSchema`,
   * which every concrete class declares. The registry dispatches to the
   * effective type's class, so no test case type is hard-coded anywhere.
   * Throws a descriptive Error on the first violation.
   */
  public static validateUpdate(options: TestCaseUpdateOptions, existingType: string): void {
    if (options.public !== undefined && typeof options.public !== 'boolean') {
      throw new Error('public must be a boolean');
    }
    if (options.type !== undefined && options.type !== existingType && options.data === undefined) {
      throw new Error(`Changing test case type to "${this.id()}" requires data`);
    }
    if (options.data !== undefined) {
      const parsed = this.dataSchema.safeParse(options.data);
      if (!parsed.success) {
        throw new Error(`Invalid data for test case type "${this.id()}": ${parsed.error.message}`);
      }
    }
  }

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
