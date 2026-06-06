import { ProblemSetService } from '$lib/problemSet';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { SortOrder, SortType } from '$lib/problemSet/problemSetService';

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return redirect(302, '/');

  const serviceProvider = ServerServiceProvider.instance();
  const problemSetService = serviceProvider.getService(ProblemSetService);

  let sortBy = url.searchParams.get('sortBy') || '';
  if (!['', 'problems_solved', 'problem_count', 'completion_pct', 'difficulty'].includes(sortBy))
    sortBy = '';
  const sortOrder = url.searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';

  const { problemSets, tags, total } = await problemSetService.findByFilter({
    user: session.user,
    pageSize: 12,
    page: Number(url.searchParams.get('page') || 1),
    filters: {
      search: url.searchParams.get('search') || '',
      tags: url.searchParams.getAll('tag')
    },
    sort: {
      by: sortBy as SortType,
      order: sortOrder as SortOrder
    }
  });

  return {
    tags,
    pageCount: Math.ceil(total / 12),
    problemSets
  };
};
