import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ProblemService } from '$lib/problem/problemService';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { readUuidParam } from '$lib/utils/params';
import { toProblemLink } from '$lib/problem';

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) redirect(302, '/');

  const registryProvider = ServerRegistryProvider.instance();
  const problemService = await registryProvider.getService(ProblemService);
  const practiceSessionService = await registryProvider.getService(PracticeSessionService);

  // `problem_id` was validated by the parent loader that redirected here.
  const problem = await problemService.findById({ id: params.problem_id, user: session.user });
  if (!problem) throw error(404, { message: 'Not Found' });

  const practiceSession = await practiceSessionService.findById({
    id: readUuidParam(params.session_id),
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
