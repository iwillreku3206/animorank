import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';
import type { ProblemTestCase } from '$lib/zenstack/models';
// import type { TestCaseResult } from '$lib/types/codeExecution';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import { TestCaseService } from '$lib/testCase/testCaseService';
import type { TestCaseResult } from '$lib/testCase/testCase';

const runValidator = z.object({
  code: z.string(),
  test_type: z.enum(['public', 'all']).default('public')
});

const testCaseRegistry = new TestCaseRegistry();

async function runTestCase(dbTestCase: ProblemTestCase, code: string): Promise<TestCaseResult> {
  const testCaseInstance = testCaseRegistry.getInstance(dbTestCase.type, dbTestCase);
  const result = await testCaseInstance.execute(code);

  if (!dbTestCase.public) {
    result.testCaseInfo = [];
  }

  return result;
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const {
    success: parseSuccess,
    data: parsedData,
    error: parseError
  } = await runValidator.safeParseAsync(await request.json());
  if (!parseSuccess) return error(400, parseError);

  const practiceSession = await db.practiceSession.findUnique({
    where: { id: params.id, student_id: session.user.id },
    include: { problem: { include: { test_cases: true } } }
  });

  if (!practiceSession) return error(404, 'Practice session not found');

  const { code, test_type } = parsedData;
  const testCases =
    test_type === 'public'
      ? practiceSession.problem.test_cases.filter((tc) => tc.public)
      : practiceSession.problem.test_cases;

  const results = await Promise.all(testCases.map((tc) => runTestCase(tc, code)));

  if (test_type === 'all') {
    return successObject({
      results: results.map((r) => ({ success: r.success }))
    });
  }

  return successObject({
    results: results
  });
};
