import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';
import type { ProblemTestCase } from '$lib/zenstack/models';
import type { TestCase, TestCaseResult } from '$lib/testCase/testCase';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { ProblemService } from '$lib/problem/problemService';
import { TestCaseService } from '$lib/testCase/testCaseService';

const runValidator = z.object({
  test_type: z.enum(['public', 'all']).default('public')
});

async function runTestCase(testCase: TestCase<ProblemTestCase>, code: string): Promise<TestCaseResult> {
  const result = await testCase.execute(code);

  if (!testCase.dbTestCase.public) {
    result.runInfo = [];
    // For convenience, we just want to delete this field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((result as any).testCaseInfo as ProblemTestCase | undefined) = undefined;
    (result.hidden as boolean) = true;
  }

  return result;
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const serviceProvider = ServerServiceProvider.instance();
  const practiceSessionService = serviceProvider.getService(PracticeSessionService);
  const problemService = serviceProvider.getService(ProblemService);
  const testCaseService = serviceProvider.getService(TestCaseService);

  const {
    success: parseSuccess,
    data: parsedData,
    error: parseError
  } = await runValidator.safeParseAsync(await request.json());
  if (!parseSuccess) return error(400, parseError);

  const practiceSession = await practiceSessionService.findById({
    id: params.id,
    user: session.user
  });
  if (!practiceSession) return error(404, 'Practice session not found');

  const problem = await problemService.findById({
    id: practiceSession.problemId,
    user: session.user
  });
  // this should never happen, this is just a TypeScript assertion
  if (!problem) return error(404, 'Problem not found');

  const testCasesRaw = await testCaseService.findByProblem({
    problemId: problem.id,
    user: session.user
  });

  const { test_type } = parsedData;
  const testCases = test_type === 'public' ? testCasesRaw.filter((tc) => tc.dbTestCase.public) : testCasesRaw;

  const results = await Promise.all(
    testCases.map(async (tc) => {
      try {
        return await runTestCase(tc, practiceSession.previousCode.fullCode);
      } catch (error) {
        return {
          success: false as const,
          runInfo: [],
          reason: 'compile_error' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
          ...(tc.dbTestCase.public ? { hidden: false, testCaseInfo: tc.dbTestCase } : { hidden: true })
        } satisfies TestCaseResult;
      }
    })
  );

  if (test_type === 'all') {
    const allSuccess = results.reduce((prev, next) => prev && next.success, true);

    if (allSuccess) {
      await db.practiceSession.update({
        where: { id: params.id, student_id: session.user.id },
        data: {
          done: true
        }
      });
    }

    return successObject({
      results
    });
  }

  return successObject({
    results
  });
};
