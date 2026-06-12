import { ProblemSetService } from '$lib/problemSet';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { FilterStatus, SortOrder, SortType } from '$lib/problemSet/problemSetService';
import { groupBy } from '$lib/utils/groupBy';

const pageSize = 12;

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return redirect(302, '/');

  const serviceProvider = ServerServiceProvider.instance();
  const problemSetService = serviceProvider.getService(ProblemSetService);

  const params = url.searchParams;
  let sortBy = params.get('sortBy') || '';
  if (!['', 'problems_solved', 'problem_count', 'completion_pct', 'difficulty'].includes(sortBy))
    sortBy = '';
  const sortOrder = params.get('sortOrder') === 'desc' ? 'desc' : 'asc';

  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '1') || 1;

  const selectedTags = params.getAll('tag');
  let status = params.get('status') ?? undefined;
  if (!['not_started', 'in_progress', 'complete'].includes(status || '')) status = undefined;
  const creator = params.get('creator') || undefined;
  const bookmarked = params.get('bookmarked') === 'true';

  const problemSetsQueryResult = await problemSetService.findByFilter({
    user: session.user,
    filters: {
      bookmarked,
      creator,
      search,
      status: status as FilterStatus,
      tags: selectedTags
    },
    page,
    pageSize,
    sort: { by: sortBy as SortType, order: sortOrder as SortOrder },
    studentProgress: false
  });

  const problemSets = problemSetsQueryResult.problemSets.map((ps) => ({
    id: ps.id,
    title: ps.title,
    owners: ps.authors,
    description: ps.description || '',
    bookmarked: ps.bookmarked,
    subject: ps.subject,
    tags: [ps.difficulty, ...ps.topics].filter((t) => !!t)
  }));

  const tagGroups = groupBy(Object.values(problemSetsQueryResult.tags), (t) => t.type);

  const creatorMap: Record<string, string> = {};
  for (const p of problemSetsQueryResult.problemSets) {
    for (const a of p.authors) {
      creatorMap[a.id] = a.name;
    }
  }

  return {
    user: session.user,
    topicTags: (tagGroups['TopicTag'] ?? []).map((t) => t.model),
    difficultyTags: (tagGroups['DifficultyTag'] ?? []).map((t) => t.model),
    subjectTags: (tagGroups['SubjectTag'] ?? []).map((t) => t.model),
    creators: Object.entries(creatorMap).map((c) => ({ id: c[0], name: c[1] })),
    pagination: {
      pageCount: Math.ceil(problemSetsQueryResult.total / pageSize)
    },
    problemSets: problemSets
  };
};
