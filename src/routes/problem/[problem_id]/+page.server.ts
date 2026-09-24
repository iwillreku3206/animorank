import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { ProblemService } from '$lib/problem/problemService';
import { readUuidParam } from '$lib/utils/params';

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) redirect(302, '/');

  const rp = ServerRegistryProvider.instance();
  const practiceSessionService = await rp.getService(PracticeSessionService);
  const problemService = await rp.getService(ProblemService);

  const problemId = readUuidParam(params.problem_id);
  const problem = await problemService.findById({ id: problemId, user: session.user });
  if (!problem) throw error(404, { message: 'Not Found' });

  const practiceSession = await practiceSessionService.findLatestOrCreate({
    problemId,
    user: session.user
  });

  if (!practiceSession) throw error(404, { message: 'Not Found' });

  throw redirect(302, `/problem/${problemId}/${practiceSession.id}`);
};
