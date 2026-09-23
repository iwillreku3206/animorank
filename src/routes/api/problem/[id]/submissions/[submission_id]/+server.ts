import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';

/**
 * One submission including the code that was sent, for the read-only viewer.
 *
 * Split from the list endpoint so that browsing a history never ships every
 * stored source file along with it.
 */
export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  // student_id is part of the lookup rather than a check after the fact, so a
  // guessed submission id resolves to nothing instead of another student's code.
  const submission = await db.submission.findFirst({
    where: {
      id: params.submission_id,
      student_id: session.user.id,
      problem_id: params.id
    },
    select: {
      id: true,
      passed: true,
      tests_passed: true,
      tests_total: true,
      code: true,
      full_code: true,
      created_at: true
    }
  });
  if (!submission) return error(404, 'Submission not found');

  return successObject({ submission });
};
