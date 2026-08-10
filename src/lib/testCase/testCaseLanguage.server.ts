import type { CodeExecutor } from '$lib/executor';
import type { IntoJsonValue } from '$lib/types/utils';
import type { ServerTestCase } from './testCase.server';
import type { TestCaseResult } from './types';

/**
 * @description An implementation of a test case for a language
 */
// Allowed because TestCase will always require the generic parameters to be valid when passed in
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class TestCaseLanguage<TC extends ServerTestCase<any, any>> {
  protected testCase: TC;

  constructor(testCase: TC) {
    this.testCase = testCase;
  }

  public abstract execute(
    // eslint-disable-next-line no-unused-vars
    executor: CodeExecutor,
    // eslint-disable-next-line no-unused-vars
    editorState: IntoJsonValue
  ): Promise<
    TestCaseResult<TC extends ServerTestCase<IntoJsonValue, infer RunInfo extends IntoJsonValue> ? RunInfo : never>
  >;
}
