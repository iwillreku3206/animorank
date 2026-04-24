import { JUDGE0_BASE_URL } from '$env/static/private';
import type { Judge0SubmissionRequest, Judge0SubmissionResponse } from '$lib/types/judge0';
import AdmZip from 'adm-zip';
import type { FunctionOutputTestCase, ProblemTestCaseOperator } from '$lib/zenstack/models';
import levenshtein_h from './libs/levenshtein.h?raw';
import levenshtein_c from './libs/levenshtein.c?raw';
import { typeToPrintf, typeToString } from '$lib/utils/typeToString';
import type { TestCaseResult } from '$lib/types/codeExecution';
import fs from 'fs';

const compile = `
gcc -Werror -Wall -o program *.c 
`;

const run = `
./program
`;

export const mainRegex = /\s*(int|void)\s+main\s*\([^)]*\)\s*\{[^}]*\}\s*/g;

const operatorMap: Record<ProblemTestCaseOperator, (expected: string, actual: string) => string> = {
  EQUAL: (expected, actual) => `${actual} == ${expected}`,
  NOT_EQUAL: (expected, actual) => `${actual} != ${expected}`,
  GREATER_THAN: (expected, actual) => `${actual} > ${expected}`,
  GREATER_THAN_EQUAL: (expected, actual) => `${actual} >= ${expected}`,
  LESS_THAN: (expected, actual) => `${actual} < ${expected}`,
  LESS_THAN_EQUAL: (expected, actual) => `${actual} <= ${expected}`,
  WITHIN_RANGE: (expected, actual) =>
    `${actual} <= ${actual} + ${expected} && ${actual} >= ${actual} - ${expected}`,
  LEVENSHTEIN_SIMILARITY: (expected, actual) => `levenshtein(${actual}) <= ${expected}`
};

export async function testFunctionTestCase(
  testCase: FunctionOutputTestCase,
  submittedCode: string
): Promise<TestCaseResult> {
  const zip = new AdmZip();
  const submissionWithoutMain = submittedCode.replace(mainRegex, '');

  const mainCode = `
#include "submission.h"
#include "levenshtein.h"
#include <stdio.h>

int main() {
  ${typeToString(testCase.expected_output)} actual = ${testCase.function_name}(${testCase.parameters
    .map((parameter) => parameter.value)
    .join(', ')});

  int success = ${operatorMap[testCase.operator](testCase.expected_output.value, 'actual')};

  printf("%d\\n", success);
  printf("${typeToPrintf(testCase.expected_output)}", actual);
  return 0;
}
`;

  const submissionHeader = `
${typeToString(testCase.expected_output)} ${testCase.function_name}(${testCase.parameters.map((parameter) => typeToString(parameter))});
  `;

  zip.addFile('submission.c', Buffer.from(submissionWithoutMain, 'utf8'));
  zip.addFile('submission.h', Buffer.from(submissionHeader, 'utf8'));
  zip.addFile('levenshtein.c', Buffer.from(levenshtein_c, 'utf8'));
  zip.addFile('levenshtein.h', Buffer.from(levenshtein_h, 'utf8'));
  zip.addFile('main.c', Buffer.from(mainCode, 'utf8'));
  zip.addFile('compile', Buffer.from(compile, 'utf8'));
  zip.addFile('run', Buffer.from(run, 'utf8'));

  const submissionParams: Judge0SubmissionRequest = {
    language_id: 89,
    additional_files: zip.toBuffer().toString('base64')
  };

  fs.writeFileSync('/tmp/dbg.zip', zip.toBuffer());

  const req = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submissionParams)
  });

  const res = (await req.json()) as Judge0SubmissionResponse;

  if (res.status.id === 6) {
    // Compile error
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
      run_info: {
        actual: output,
        expected: testCase.expected_output.value
      },
      test_info: testCase
    };
  } else {
    return {
      success: false,
      run_info: {
        actual: output,
        expected: testCase.expected_output.value
      },
      error_reason: {
        type: 'incorrect_response'
      },
      test_info: testCase
    };
  }
}
