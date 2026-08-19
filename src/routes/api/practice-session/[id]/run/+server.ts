import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { TestCaseResult } from '$lib/testCase/types';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { ProblemService } from '$lib/problem/problemService';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { LanguageRegistry } from '$lib/language/languageRegistry';
import { CodeExecutor } from '$lib/executor';

const runValidator = z.object({
  test_type: z.enum(['public', 'all']).default('public')
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const serviceProvider = ServerServiceProvider.instance();
  const practiceSessionService = serviceProvider.getService(PracticeSessionService);
  const problemService = serviceProvider.getService(ProblemService);

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

  const testCasesRaw = await TestCaseService.instance().findByProblem({
    problemId: problem.id,
    user: session.user
  });

  const { test_type } = parsedData;
  const language = new LanguageRegistry().getInstance(problem.model.language.toLowerCase());
  const executor = serviceProvider.getService(CodeExecutor);
  const state = {
    sections: Object.fromEntries(practiceSession.previousCode.sections.map((s) => [s.slot.label, s.code]))
  };
  const testCases = testCasesRaw.filter((tc) => (test_type === 'public' ? tc.public : true));

  const results = await Promise.all(
    testCases.map(async (tc) => {
      try {
        const serverTestCase = ServerTestCaseRegistry.instance().from(tc, problem);
        return await serverTestCase.run(language, executor, state);
      } catch (error) {
        return {
          success: false,
          testCaseInfo: tc.public ? (tc as TestCaseModel & { public: true }) : { public: false },
          ...(tc.public
            ? {
                compilerOutput: error instanceof Error ? error.message : 'Unknown error',
                runInfo: [] as unknown as never
              }
            : {})
        } as TestCaseResult<never>;
      }
    })
  );

  const allSuccess = results.reduce((prev, next) => prev && next.success, true);

  if (test_type === 'all' && allSuccess) {
    await db.practiceSession.update({
      where: { id: params.id, student_id: session.user.id },
      data: {
        done: true
      }
    });
  }

  // Only public test results are sent to the client; hidden tests still run
  // and count toward `success` above, but their details never leave the server.
  return successObject({
    success: allSuccess,
    results: results.filter((r) => r.testCaseInfo.public)
  });
};
