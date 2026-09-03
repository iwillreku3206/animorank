import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) redirect(302, '/');

  const registryProvider = ServerRegistryProvider.instance();
  const practiceSessionService = await registryProvider.getService(PracticeSessionService);

  const practiceSession = await practiceSessionService.findLatestNonDoneOrCreate({
    problemId: params.problem_id,
    user: session.user
  });

  if (!practiceSession) throw error(404, { message: 'Not Found' });

  throw redirect(302, `/problem/${params.problem_id}/${practiceSession.id}`);
};
