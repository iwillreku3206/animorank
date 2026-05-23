import { db } from '$lib/zenstack';
import type { ProblemTestCase } from '$lib/zenstack/models';
import {
  TestCase,
  type CreateOptions,
  type TestCaseResult,
  type UpdateOptions
} from '$lib/testCase/testCase';
import { z } from 'zod';

import compile from './compile.sh?raw';
import run from './run.sh?raw';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { CodeExecutor, type CodeExecutionRequest } from '$lib/testCase/executor';

const programIOTestCaseValidator = z.object({
  input: z.string(),
  output: z.string()
});

export class ProgramIOTestCase extends TestCase<
  Extract<ProblemTestCase, { type: 'ProgramIOTestCase' }>
> {
  constructor(dbTestCase: ProblemTestCase) {
    super(dbTestCase as Extract<ProblemTestCase, { type: 'ProgramIOTestCase' }>);
  }

  public async execute(studentCode: string): Promise<TestCaseResult> {
    const { dbTestCase } = this;
    const codeExecutor = ServerServiceProvider.instance().getService(CodeExecutor);

    // For now, we assume that it will be written in C.

    const codeExecutionRequest: CodeExecutionRequest = {
      compileScript: compile,
      runScript: run,
      stdin: dbTestCase.input,
      files: [
        {
          name: 'main.c',
          contents: Buffer.from(studentCode, 'utf8')
        }
      ],
      timeLimit: 30
    };

    const executionResults = await codeExecutor.executeCode(codeExecutionRequest);
    if (!executionResults.success) {
      return {
        success: false,
        runInfo: [],
        hidden: false,
        testCaseInfo: dbTestCase,
        reason: executionResults.reason
      };
    }

    const { stdout } = executionResults;
    const success = stdout === dbTestCase.output;

    const result = {
      hidden: false,
      testCaseInfo: dbTestCase,
      runInfo: [{ expected: dbTestCase.output, actual: executionResults.stdout, symbol: 'stdio' }]
    };

    return success ? { success, ...result } : { success, reason: 'wrong_answer', ...result };
  }

  public static async create(options: CreateOptions): Promise<ProblemTestCase> {
    const newTestCase = await db.programIOTestCase.create({
      data: { problem_id: options.problemId }
    });
    return newTestCase as ProblemTestCase;
  }

  async update(options: UpdateOptions<z.infer<typeof programIOTestCaseValidator>>): Promise<void> {
    const { id, update } = options;
    const result = programIOTestCaseValidator.safeParse(update);
    if (!result.success) {
      throw new Error(`Invalid ProgramIOTestCase data: ${JSON.stringify(result.error)}`);
    }
    await db.programIOTestCase.update({
      where: { id },
      data: result.data
    });
  }
}
