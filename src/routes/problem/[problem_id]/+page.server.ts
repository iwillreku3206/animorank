import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) redirect(302, '/');

  const serviceProvider = ServerServiceProvider.instance();
  const practiceSessionService = serviceProvider.getService(PracticeSessionService);

  const practiceSession = await practiceSessionService.findLatestNonDoneOrCreate({
    problemId: params.problem_id,
    user: session.user
  });

  if (!practiceSession) throw error(404, { message: 'Not Found' });

  throw redirect(302, `/problem/${params.problem_id}/${practiceSession.id}`);
};
