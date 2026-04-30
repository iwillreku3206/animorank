import { JUDGE0_BASE_URL } from '$env/static/private';
import { db } from '$lib/zenstack';
import type { TestCaseResult } from '$lib/types/codeExecution';
import type {
  ProblemTestCase,
  FunctionOutputTestCase,
  ProgramIOTestCase,
  CustomTestCase,
  ProblemTestCaseOperator
} from '$lib/zenstack/models';
import { ProblemTestCaseType } from '$lib/zenstack/models';
import type {
  FunctionOutputTestCaseUpdateArgs,
  ProgramIOTestCaseUpdateArgs,
  CustomTestCaseUpdateArgs
} from '$lib/zenstack/input';
import type { Judge0SubmissionRequest, Judge0SubmissionResponse } from '$lib/types/judge0';
import AdmZip from 'adm-zip';
import { typeToPrintf, typeToString } from '$lib/utils/typeToString';
import levenshtein_h from './libs/levenshtein.h?raw';
import levenshtein_c from './libs/levenshtein.c?raw';
import compile from './libs/compile.sh?raw';
import run from './libs/run.sh?raw';

// Shared utilities

export const mainRegex = /\s*(int|void)\s+main\s*\([^)]*\)\s*\{[^}]*\}\s*/g;

/**
 * Abstract base class for test cases.
 *
 * @example
 * // Execute a test:
 * const result = await TestCase.for(testCase).execute(studentCode);
 *
 * // Create a new test case in the DB:
 * const tc = await TestCase.create('ProgramIOTestCase', problemId);
 */
export abstract class TestCase<T extends ProblemTestCase, TUpdate = never> {
  constructor(protected readonly testCase: T) {}

  /**
   * Returns the concrete handler for the given test case.
   */
  static for(tc: ProblemTestCase): TestCase<ProblemTestCase, unknown> {
    switch (tc.type) {
      case 'FunctionOutputTestCase':
        return new FunctionOutputTestCaseHandler(tc as FunctionOutputTestCase);
      case 'ProgramIOTestCase':
        return new ProgramIOTestCaseHandler(tc as ProgramIOTestCase);
      case 'CustomTestCase':
        return new CustomTestCaseHandler(tc as CustomTestCase);
      default:
        throw new Error(`Unknown test case type: ${(tc as ProblemTestCase).type}`);
    }
  }

  /** Creates a new test case of the given type for the specified problem. */
  static async create(type: ProblemTestCaseType, problemId: string): Promise<ProblemTestCase> {
    const args = { data: { problem_id: problemId } };
    switch (type) {
      case 'FunctionOutputTestCase':
        return db.functionOutputTestCase.create(args);
      case 'ProgramIOTestCase':
        return db.programIOTestCase.create(args);
      case 'CustomTestCase':
        return db.customTestCase.create(args);
    }
  }

  /** Returns all test cases belonging to the given problem. */
  static async findByProblem(problemId: string): Promise<ProblemTestCase[]> {
    return db.problemTestCase.findMany({ where: { problem_id: problemId } });
  }

  /** Returns a single test case by ID, or null if not found. */
  static async findById(id: string): Promise<ProblemTestCase | null> {
    return db.problemTestCase.findUnique({ where: { id } });
  }

  /** Deletes a test case by ID. Returns the Prisma deleteMany result. */
  static async delete(id: string) {
    return db.problemTestCase.deleteMany({ where: { id } });
  }

  /**
   * Updates an instance of this test case in the DB with the provided data.
   * The caller is responsible for validating `data` before calling this.
   */
  abstract update(id: string, data: TUpdate): Promise<void>;

  /** Runs the test case against the given student code via Judge0. */
  abstract execute(studentCode: string): Promise<TestCaseResult>;
}

// Concrete handlers

class FunctionOutputTestCaseHandler extends TestCase<
  FunctionOutputTestCase,
  FunctionOutputTestCaseUpdateArgs['data']
> {
  async update(id: string, data: FunctionOutputTestCaseUpdateArgs['data']): Promise<void> {
    await db.functionOutputTestCase.update({ where: { id }, data });
  }

  async execute(studentCode: string): Promise<TestCaseResult> {
    const { testCase } = this;
    const zip = new AdmZip();
    const submissionWithoutMain = studentCode.replace(mainRegex, '');

    const operatorLogic = operatorMap[testCase.operator](testCase.expected_output.value, 'actual');
    const mainCode = this.generateMainCode(operatorLogic);
    const submissionHeader = this.generateSubmissionHeader();

    zip.addFile('submission.c', Buffer.from(submissionWithoutMain, 'utf8'));
    zip.addFile('submission.h', Buffer.from(submissionHeader, 'utf8'));
    zip.addFile('levenshtein.c', Buffer.from(levenshtein_c, 'utf8'));
    zip.addFile('levenshtein.h', Buffer.from(levenshtein_h, 'utf8'));
    zip.addFile('main.c', Buffer.from(mainCode, 'utf8'));
    zip.addFile('compile', Buffer.from(compile, 'utf8'));
    zip.addFile('run', Buffer.from(run, 'utf8'));

    const submissionParams: Judge0SubmissionRequest = {
      language_id: Judge0Language.MultiFile,
      additional_files: zip.toBuffer().toString('base64')
    };

    const req = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionParams)
    });

    const res = (await req.json()) as Judge0SubmissionResponse;

    if (res.status.id === 6) {
      return {
        success: false,
        error_reason: {
          type: 'compile_error',
          error: Buffer.from(res.compile_output || '', 'base64').toString('utf8')
        }
      };
    }

    if (res.status.id !== 3) return { success: false, error_reason: { type: 'runtime_error' } };
    if (!res.stdout) return { success: false, error_reason: { type: 'unknown_error' } };

    const [success, output] = Buffer.from(res.stdout, 'base64').toString('utf8').split('\n');

    if (success.includes('1')) {
      return {
        success: true,
        run_info: { actual: output, expected: testCase.expected_output.value },
        test_info: testCase
      };
    } else {
      return {
        success: false,
        run_info: { actual: output, expected: testCase.expected_output.value },
        error_reason: { type: 'incorrect_response' },
        test_info: testCase
      };
    }
  }

  private generateMainCode(operatorLogic: string): string {
    const { testCase } = this;
    const expectedType = typeToString(testCase.expected_output);
    const params = testCase.parameters.map((p) => p.value).join(', ');
    const printfFormat = typeToPrintf(testCase.expected_output);

    return `
#include "submission.h"
#include "levenshtein.h"
#include <stdio.h>

int main() {
  ${expectedType} actual = ${testCase.function_name}(${params});

  int success = ${operatorLogic};

  printf("%d\\n", success);
  printf("${printfFormat}", actual);
  return 0;
}
`;
  }

  private generateSubmissionHeader(): string {
    const { testCase } = this;
    const expectedType = typeToString(testCase.expected_output);
    const params = testCase.parameters.map((p) => typeToString(p)).join(', ');

    return `${expectedType} ${testCase.function_name}(${params});\n`;
  }
}

class ProgramIOTestCaseHandler extends TestCase<
  ProgramIOTestCase,
  ProgramIOTestCaseUpdateArgs['data']
> {
  async update(id: string, data: ProgramIOTestCaseUpdateArgs['data']): Promise<void> {
    await db.programIOTestCase.update({ where: { id }, data });
  }

  async execute(studentCode: string): Promise<TestCaseResult> {
    const { testCase } = this;

    const submissionParams: Judge0SubmissionRequest = {
      language_id: Judge0Language.C,
      source_code: Buffer.from(studentCode).toString('base64'),
      stdin: Buffer.from(testCase.input).toString('base64')
    };

    const req = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionParams)
    });

    const res = (await req.json()) as Judge0SubmissionResponse;

    if (res.status.id === 6) {
      return {
        success: false,
        test_info: testCase,
        error_reason: {
          type: 'compile_error',
          error: Buffer.from(res.compile_output || '', 'base64').toString('utf8')
        }
      };
    }

    if (res.status.id !== 3)
      return { success: false, test_info: testCase, error_reason: { type: 'runtime_error' } };
    if (!res.stdout)
      return { success: false, test_info: testCase, error_reason: { type: 'unknown_error' } };

    const output = Buffer.from(res.stdout, 'base64').toString('utf8');

    if (testCase.output === output) {
      return {
        success: true,
        test_info: testCase,
        run_info: { actual: output, expected: testCase.output }
      };
    } else {
      return {
        success: false,
        test_info: testCase,
        run_info: { actual: output, expected: testCase.output },
        error_reason: { type: 'incorrect_response' }
      };
    }
  }
}

class CustomTestCaseHandler extends TestCase<CustomTestCase, CustomTestCaseUpdateArgs['data']> {
  async update(id: string, data: CustomTestCaseUpdateArgs['data']): Promise<void> {
    await db.customTestCase.update({ where: { id }, data });
  }

  async execute(studentCode: string): Promise<TestCaseResult> {
    const { testCase } = this;
    const zip = new AdmZip();
    const submissionWithoutMain = studentCode.replace(mainRegex, '');

    zip.addFile('submission.c', Buffer.from(submissionWithoutMain, 'utf8'));
    zip.addFile('main.c', Buffer.from(testCase.test_code, 'utf8'));
    zip.addFile('compile', Buffer.from(compile, 'utf8'));
    zip.addFile('run', Buffer.from(run, 'utf8'));

    const submissionParams: Judge0SubmissionRequest = {
      language_id: Judge0Language.MultiFile,
      additional_files: zip.toBuffer().toString('base64')
    };

    const req = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionParams)
    });

    const res = (await req.json()) as Judge0SubmissionResponse;

    if (res.status.id !== 3) return { success: false, error_reason: { type: 'runtime_error' } };
    return { success: true };
  }
}
