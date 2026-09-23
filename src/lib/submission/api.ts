import { errorFrom } from '$lib/response';

/** One row of a problem's submission history, without its source. */
export type SubmissionSummary = {
  id: string;
  passed: boolean;
  tests_passed: number;
  tests_total: number;
  /** ISO 8601, as JSON serialization leaves it. */
  created_at: string;
};

/** A single submission including the code that was sent. */
export type SubmissionDetail = SubmissionSummary & {
  /** Slot label to source: the parts the student authored. */
  code: Record<string, string>;
  /** The assembled program as compiled, template included. What the viewer shows. */
  full_code: string;
};

export type SubmissionPage = {
  submissions: SubmissionSummary[];
  hasMore: boolean;
};

/**
 * One page of the signed-in student's submissions for a problem, newest first.
 *
 * `before` is the `created_at` of the last row already held, which pages
 * backwards through the history without the skipping that offsets suffer when
 * a new submission lands mid-browse.
 */
export async function fetchSubmissions(
  problem_id: string,
  options: { limit?: number; before?: string } = {}
): Promise<SubmissionPage> {
  const query = new URLSearchParams();
  if (options.limit !== undefined) query.set('limit', String(options.limit));
  if (options.before !== undefined) query.set('before', options.before);

  const suffix = query.size > 0 ? `?${query}` : '';
  const response = await fetch(`/api/problem/${problem_id}/submissions${suffix}`);
  if (!response.ok) throw await errorFrom(response, 'Failed to load submissions');

  return (await response.json()) as SubmissionPage;
}

/** One submission with its source, fetched when the student opens it. */
export async function fetchSubmission(problem_id: string, submission_id: string): Promise<SubmissionDetail> {
  const response = await fetch(`/api/problem/${problem_id}/submissions/${submission_id}`);
  if (!response.ok) throw await errorFrom(response, 'Failed to load submission');

  const { submission } = (await response.json()) as { submission: SubmissionDetail };
  return submission;
}
