import type { Problem } from '$lib/problem';
import { ServerTestCase } from '$lib/testCase/testCase.server';
import type { TestCaseResult } from '$lib/testCase/types';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import {
  outputMatches,
  StdioTestCase,
  StdioTestCaseDataSchema,
  type StdioTestCaseData,
  type StdioTestCaseRunInfo,
  type WhitespaceMode
} from './stdioTestCase.svelte';
import type { StdioRunOutcome } from './stdioTestCaseLanguage.server';
import { StdioTestCaseLanguageRegistry } from './languageRegistry';

export class ServerStdioTestCase extends ServerTestCase<StdioTestCaseData, StdioTestCaseRunInfo> {
  static languageRegistry = new StdioTestCaseLanguageRegistry();
  public static dataSchema = StdioTestCaseDataSchema;
  public constructor(model: TestCaseModel, problem: Problem) {
    super(new StdioTestCase(model, problem));
  }
  public static id() {
    return 'stdio';
  }

  public static async create(problem: Problem): Promise<ServerTestCase> {
    const data: StdioTestCaseData = {
      input: '',
      output: '',
      whitespace: 'strict'
    };
    return new ServerStdioTestCase(await ServerTestCase.createModel('stdio', problem, data), problem);
  }

  /**
   * Decide a run. Every stdio verdict is reached here rather than in a
   * language binding, so the whitespace mode is honoured no matter which
   * language produced the output.
   */
  public grade(outcome: StdioRunOutcome): TestCaseResult<StdioTestCaseRunInfo> {
    const success =
      outcome.compileExitCode === 0 &&
      outcome.runExitCode === 0 &&
      outputMatches(this.testCase.data.output, outcome.stdout, this.whitespaceMode());

    return this.result(success, outcome.stdout, { compilerOutput: outcome.compilerOutput });
  }

  private whitespaceMode(): WhitespaceMode {
    return this.testCase.data.whitespace ?? 'strict';
  }

  /**
   * Assemble a result at the visibility the test case allows. Hidden results
   * carry no details: not the model (whose `data` holds the expected output),
   * no runInfo, nothing but the flag.
   */
  private result(
    success: boolean,
    actual: string,
    detail: { compilerOutput?: string; failureReason?: string } = {}
  ): TestCaseResult<StdioTestCaseRunInfo> {
    const model = this.testCase.model;
    if (model.public !== true) {
      return { success, testCaseInfo: { public: false } };
    }

    return {
      success,
      runInfo: { expected: this.testCase.data.output, actual },
      testCaseInfo: model as TestCaseModel & { public: true },
      ...(detail.compilerOutput !== undefined && { compilerOutput: detail.compilerOutput }),
      ...(detail.failureReason !== undefined && { failureReason: detail.failureReason })
    };
  }

  protected failureResult(error: unknown): TestCaseResult<StdioTestCaseRunInfo> {
    return this.result(false, '', {
      failureReason: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
