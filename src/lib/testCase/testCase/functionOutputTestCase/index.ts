import { db } from '$lib/zenstack';
import type { ProblemTestCase } from '$lib/zenstack/models';
import { TestCase, type CreateOptions, type TestCaseResult, type UpdateOptions } from '$lib/testCase/testCase';
import { FunctionOutputTestCaseOperator } from '$lib/zenstack/models';
import { z } from 'zod';

import compile from './compile.sh?raw';
import run from './run.sh?raw';
import { CCodeGenerator } from '$lib/testCase/codeGenerator/c';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { CodeExecutor, type CodeExecutionRequest } from '$lib/testCase/executor';

const mainRegex = /\s*(int|void)\s+main\s*\([^)]*\)\s*\{[^}]*\}\s*/g;

const parameterSchema = z.object({
  type: z.string(),
  data: z.unknown()
});

const comparisonSchema = z.object({
  type: z.string(),
  data: z.unknown(),
  symbol: z.string(),
  operator: z.enum(FunctionOutputTestCaseOperator),
  range_value: z.string().optional()
});

const functionOutputTestCaseValidator = z.object({
  parameters: z.array(parameterSchema),
  comparisons: z.array(comparisonSchema),
  return_type: parameterSchema,
  function_name: z.string()
});

export class FunctionOutputTestCase extends TestCase<
  Extract<ProblemTestCase, { type: 'FunctionOutputTestCase' }>
> {
  constructor(dbTestCase: ProblemTestCase) {
    super(dbTestCase as Extract<ProblemTestCase, { type: 'FunctionOutputTestCase' }>);
  }

  public async execute(studentCode: string): Promise<TestCaseResult> {
    const { dbTestCase } = this;
    const codeExecutor = ServerServiceProvider.instance().getService(CodeExecutor);

    // For now, we assume that it will be written in C.
    const codeGenerator = new CCodeGenerator();
    const testCode = codeGenerator.generateTestCode(dbTestCase);

    const codeExecutionRequest: CodeExecutionRequest = {
      compileScript: compile,
      runScript: run,
      files: [
        {
          name: 'submission.c',
          contents: Buffer.from(studentCode.replaceAll(mainRegex, ''), 'utf8')
        },
        { name: 'main.c', contents: Buffer.from(testCode, 'utf8') }
      ],
      timeLimit: 30
    };

    const executionResults = await codeExecutor.executeCode(codeExecutionRequest);
    if (!executionResults.success) {
      return { success: false, testCaseInfo: [], reason: executionResults.reason };
    }

    const { stdout } = executionResults;
    const lines = stdout.split('\n');

    let success = true;

    const comparisons: TestCaseResult['testCaseInfo'][number][] = [];

    for (let i = 0; i < dbTestCase.comparisons.length; i++) {
      const actual = lines[i * 3];
      const expected = lines[i * 3 + 1];
      const result = lines[i * 3 + 2];

      comparisons.push({ actual, expected, symbol: dbTestCase.comparisons[i].symbol });

      if (result.trim().startsWith('0')) success = false;
    }

    return { success, testCaseInfo: comparisons };
  }

  public static async create(options: CreateOptions): Promise<ProblemTestCase> {
    const newTestCase = await db.functionOutputTestCase.create({
      data: { problem_id: options.problemId }
    });
    return newTestCase as ProblemTestCase;
  }

  async update(options: UpdateOptions<z.infer<typeof functionOutputTestCaseValidator>>): Promise<void> {
    const { id, update } = options;
    const result = functionOutputTestCaseValidator.safeParse(update);
    if (!result.success) {
      throw new Error(`Invalid FunctionOutputTestCase data: ${JSON.stringify(result.error.errors)}`);
    }
    await db.functionOutputTestCase.update({
      where: { id },
      data: result.data
    });
  }
}
