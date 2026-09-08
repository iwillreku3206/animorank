import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { ProblemService } from '$lib/problem/problemService';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { toProblemLink } from '$lib/problem';

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) redirect(302, '/');

  const serviceProvider = ServerServiceProvider.instance();
  const problemService = serviceProvider.getService(ProblemService);
  const practiceSessionService = serviceProvider.getService(PracticeSessionService);

  const problem = await problemService.findById({ id: params.problem_id, user: session.user });
  if (!problem) throw error(404, { message: 'Not Found' });

  const practiceSession = await practiceSessionService.findById({
    id: params.session_id,
    user: session.user
  });
  if (!practiceSession) throw redirect(302, `/problem/${params.problem_id}`);

  const neighbors = await problemService.findNeighbors({ problem, user: session.user });

  return {
    problem: problem.model,
    practiceSession: practiceSession.model,
    user: session.user,
    neighbors: {
      previous: toProblemLink(neighbors.previous),
      next: toProblemLink(neighbors.next)
    }
  };
};
