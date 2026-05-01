import { db } from '$lib/zenstack';
import type { ProblemTestCase } from '$lib/zenstack/models';
import { TestCase, type CreateOptions, type TestCaseResult } from '$lib/testCase/testCase';

import compile from './compile.sh?raw';
import run from './run.sh?raw';

const mainRegex = /\s*(int|void)\s+main\s*\([^)]*\)\s*\{[^}]*\}\s*/g;

export class FunctionOutputTestCase extends TestCase<
  Extract<ProblemTestCase, { type: 'FunctionOutputTestCase' }>
> {
  constructor(dbTestCase: ProblemTestCase) {
    super(dbTestCase as Extract<ProblemTestCase, { type: 'FunctionOutputTestCase' }>);
  }

  public async execute(): Promise<TestCaseResult> {
    const { dbTestCase } = this;

    return {
      success: false,
      runInfo: { stdout: '', exitCode: 0, success: true, executionTime: 0, stderr: '' }
    };
  }

  public static async create(options: CreateOptions): Promise<any> {
    const newTestCase = await db.functionOutputTestCase.create({
      data: { problem_id: options.problemId }
    });
    return newTestCase;
  }

  async update() {}
}
