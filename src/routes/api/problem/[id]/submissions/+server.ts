import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { error, successObject } from '$lib/response';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const queryValidator = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  before: z.coerce.date().optional()
});

/**
 * One page of the caller's own submissions for a problem, newest first.
 *
 * Keyed on the student and the problem rather than on a practice session, so
 * the list spans every sitting the student has ever had at this problem.
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const {
    success,
    data: query,
    error: zodError
  } = await queryValidator.safeParseAsync({
    limit: url.searchParams.get('limit') ?? undefined,
    before: url.searchParams.get('before') ?? undefined
  });
  if (!success) return error(400, zodError);

  const rows = await db.submission.findMany({
    // Scoped to the caller's own student id, so a row can never be read by
    // anyone but its author and no further ownership check is needed.
    where: {
      student_id: session.user.id,
      problem_id: params.id,
      // Exclusive, and exact only because `created_at` is stored at
      // millisecond precision -- the most a `Date` survives the trip back out
      // here carrying. At the schema's usual TIMESTAMPTZ(6) the truncated
      // cursor would fail to exclude the row it came from, and the boundary
      // row would be served on two consecutive pages. See the field comment in
      // src/zenstack/submission.zmodel.
      ...(query.before && { created_at: { lt: query.before } })
    },
    // `code` is deliberately absent: the list renders verdicts only, and a page
    // of full sources would dwarf the rest of the payload. The detail endpoint
    // serves the code on demand instead.
    select: {
      id: true,
      passed: true,
      tests_passed: true,
      tests_total: true,
      created_at: true
    },
    orderBy: { created_at: 'desc' },
    // One extra row answers "is there another page" without a second count query.
    take: query.limit + 1
  });

  return successObject({
    submissions: rows.slice(0, query.limit),
    hasMore: rows.length > query.limit
  });
};
