import type { CodeExecutor } from '$lib/executor';
import type { IntoJsonValue } from '$lib/types/utils';
import { TestCaseLanguage } from '$lib/testCase/testCaseLanguage.server';
import type { TestCaseResult } from '$lib/testCase/types';
import type { ServerStdioTestCase } from './stdioTestCase.server';
import type { StdioTestCaseRunInfo } from './stdioTestCase.svelte';

/**
 * What a language binding reports after building and running the submission.
 * Deliberately carries no verdict: whether the run passed is not a question a
 * language can answer, because the answer depends on the whitespace mode.
 */
export type StdioRunOutcome = {
  stdout: string;
  runExitCode?: number;
  compileExitCode?: number;
  compilerOutput?: string;
};

/**
 * Base for every stdio language binding. `execute` is written once here and
 * hands straight to the test case, so adding a language means implementing
 * `runProgram` and nothing else -- there is no verdict to get wrong, and no
 * way to miss a change to how outputs are compared.
 */
export abstract class StdioTestCaseLanguage extends TestCaseLanguage<ServerStdioTestCase> {
  protected abstract runProgram(
    // eslint-disable-next-line no-unused-vars
    executor: CodeExecutor,
    // eslint-disable-next-line no-unused-vars
    editorState: IntoJsonValue
  ): Promise<StdioRunOutcome>;

  public async execute(
    executor: CodeExecutor,
    editorState: IntoJsonValue
  ): Promise<TestCaseResult<StdioTestCaseRunInfo>> {
    return this.testCase.grade(await this.runProgram(executor, editorState));
  }
}
