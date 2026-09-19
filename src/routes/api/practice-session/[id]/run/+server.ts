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
import { LanguageRegistry } from '$lib/language/languageRegistry';
import { CodeExecutor } from '$lib/executor';
import { Logger } from '$lib/logging/logger';

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
  // `findById` resolves a session by id alone, unlike the service's update and
  // delete paths which also filter on student_id. Without this check any signed-in
  // user could run another student's session -- and, now that submissions are
  // persisted, copy that student's source into their own history.
  if (practiceSession.studentId !== session.user.id) return error(403, 'Unauthorized');

  const problem = await problemService.findById({
    id: practiceSession.problemId,
    user: session.user
  });
  // this should never happen, this is just a TypeScript assertion
  if (!problem) return error(404, 'Problem not found');

  const testCases = await serviceProvider.getService(TestCaseService).findByProblem({
    problemId: problem.id,
    user: session.user
  });

  const { test_type } = parsedData;
  const language = new LanguageRegistry().getInstance(problem.model.language.toLowerCase());
  const executor = serviceProvider.getService(CodeExecutor);
  // Hoisted: the getter re-runs slot parsing on every access, and the recorded
  // submission needs the assembled form from the same read.
  const previousCode = practiceSession.previousCode;
  const state = {
    sections: Object.fromEntries(previousCode.sections.map((s) => [s.slot.label, s.code]))
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

  /**
   * Whether this run reached the student's history, for a Submit that tried.
   *
   * Left undefined for a plain Run, which never writes a history row -- an
   * absent field says "not applicable" where `false` would say "we tried and
   * lost it", and only the second is worth telling the student about.
   */
  let recorded: boolean | undefined;

  if (test_type === 'all') {
    // The completion latch is written first so that a failure to record the
    // history entry can never cost a student credit for a problem they solved.
    if (allSuccess) {
      await db.practiceSession.update({
        where: { id: params.id, student_id: session.user.id },
        data: {
          done: true
        }
      });
    }

    // Every Submit is recorded, pass or fail -- the failed attempts are most of
    // what makes a history worth reading. Only aggregate counts are stored, so a
    // history row cannot reveal WHICH hidden tests failed.
    //
    // Guarded for the same reason the latch is written first: the history is a
    // record of the run, not part of it. Letting a failed insert 500 the
    // request would throw away a grading result the student has already waited
    // for -- and leave the session marked done with no verdict on screen.
    try {
      await db.submission.create({
        data: {
          student_id: practiceSession.studentId,
          problem_id: problem.id,
          passed: allSuccess,
          tests_passed: results.filter((result) => result.success).length,
          tests_total: results.length,
          code: state.sections,
          // The program as compiled. `code` alone is only the editable slots, so
          // rebuilding it later would depend on a template that may have changed.
          full_code: previousCode.fullCode
        }
      });
      recorded = true;
    } catch (submissionError) {
      // Reported to the client rather than only logged: the student's history
      // panel refetches on every Submit, and without this it would render a
      // list quietly missing the attempt they just watched run.
      recorded = false;
      // Swallowed here, so the file logger is the only trace this leaves --
      // `handleError` never sees a caught throw.
      const detail =
        submissionError instanceof Error ? (submissionError.stack ?? submissionError.message) : String(submissionError);
      serviceProvider.getService(Logger, 'api/practice-session/run').error(`Failed to record submission: ${detail}`);
    }
  }

  // Hidden test results are sent to the client as bare
  // { success, testCaseInfo: { public: false } } entries — enough to show
  // WHICH test indices failed (the response array is in test-case order),
  // with none of the details leaking: no expected/actual values, no runInfo,
  // no compilerOutput. Public results carry the full details.
  return successObject({
    success: allSuccess,
    results,
    ...(recorded !== undefined && { recorded })
  });
};
