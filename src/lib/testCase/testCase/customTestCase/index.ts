import { db } from '$lib/zenstack';
import type { ProblemTestCase } from '$lib/zenstack/models';
import { TestCase, type CreateOptions, type TestCaseResult } from '$lib/testCase/testCase';

import compile from './compile.sh?raw';
import run from './run.sh?raw';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { CodeExecutor, type CodeExecutionRequest } from '$lib/testCase/executor';

const mainRegex = /\s*(int|void)\s+main\s*\([^)]*\)\s*\{[^}]*\}\s*/g;

export class CustomTestCase extends TestCase<Extract<ProblemTestCase, { type: 'CustomTestCase' }>> {
  constructor(dbTestCase: ProblemTestCase) {
    super(dbTestCase as Extract<ProblemTestCase, { type: 'CustomTestCase' }>);
  }

  public async execute(studentCode: string): Promise<TestCaseResult> {
    const { dbTestCase } = this;
    const codeExecutor = ServerServiceProvider.instance().getService(CodeExecutor);

    const codeExecutionRequest: CodeExecutionRequest = {
      compileScript: compile,
      runScript: run,
      files: [
        {
          name: 'submission.c',
          contents: Buffer.from(studentCode.replaceAll(mainRegex, ''), 'utf8')
        },
        { name: 'main.c', contents: Buffer.from(dbTestCase.test_code, 'utf8') }
      ],
      timeLimit: 30
    };

    const executionResults = await codeExecutor.executeCode(codeExecutionRequest);
    if (!executionResults.success) {
      return { success: false, testCaseInfo: [], reason: executionResults.reason };
    }

    const exitCode = executionResults.exitCode;

    if (exitCode === 0) {
      return { success: true, testCaseInfo: [] };
    } else {
      return {
        success: false,
        testCaseInfo: [],
        reason: `custom test failed with exit code ${exitCode}`
      };
    }
  }

  public static async create(options: CreateOptions): Promise<ProblemTestCase> {
    const newTestCase = await db.customTestCase.create({
      data: { problem_id: options.problemId }
    });
    return newTestCase as ProblemTestCase;
  }

  async update() {}
}
