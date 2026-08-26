import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { TestCaseResult } from '$lib/testCase/types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { ProblemService } from '$lib/problem/problemService';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { LanguageRegistry } from '$lib/language/languageRegistry';
import { CodeExecutor } from '$lib/executor';

const runValidator = z.object({
  test_type: z.enum(['public', 'all']).default('public')
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const srp = ServerRegistryProvider.instance();
  const practiceSessionService = srp.getService(PracticeSessionService);
  const problemService = srp.getService(ProblemService);

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

  const testCases = await srp.getService(TestCaseService).findByProblem({
    problemId: problem.id,
    user: session.user
  });

  const { test_type } = parsedData;
  const language = new LanguageRegistry().getInstance(problem.model.language.toLowerCase());
  const executor = srp.getService(CodeExecutor);
  const state = {
    sections: Object.fromEntries(practiceSession.previousCode.sections.map((s) => [s.slot.label, s.code]))
  };
  const selected = testCases.filter((tc) => (test_type === 'public' ? tc.testCase.model.public : true));

  const results = await Promise.all(
    selected.map(async (tc) => {
      try {
        return await tc.run(language, executor, state);
      } catch (error) {
        return {
          success: false,
          testCaseInfo: tc.testCase.model.public
            ? (tc.testCase.model as TestCaseModel & { public: true })
            : { public: false },
          ...(tc.testCase.model.public
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

  // Hidden test results are sent to the client as bare
  // { success, testCaseInfo: { public: false } } entries — enough to show
  // WHICH test indices failed (the response array is in test-case order),
  // with none of the details leaking: no expected/actual values, no runInfo,
  // no compilerOutput. Public results carry the full details.
  return successObject({
    success: allSuccess,
    results
  });
};
