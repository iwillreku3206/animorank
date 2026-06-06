import { ProblemSetService } from '$lib/problemSet';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return redirect(302, '/');

  const serviceProvider = ServerServiceProvider.instance();
  const problemSetService = serviceProvider.getService(ProblemSetService);

  const { problemSets } = await problemSetService.findByFilter({
    user: session.user,
    pageSize: 100
  });

  return {
    problemSets
  };
};
