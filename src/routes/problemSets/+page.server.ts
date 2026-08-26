import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ProblemSetService } from '$lib/problemSet';
import { TagService } from '$lib/tag';
import type { SortOrder, SortType } from '$lib/problemSet/problemSetService';
import { groupBy } from '$lib/utils/groupBy';
import { parseFilters, parseSort } from './filterUtils';

const pageSize = 12;

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) {
    redirect(302, '/');
  }

  const problemSetService = ServerRegistryProvider.instance().getService(ProblemSetService);

  const params = url.searchParams;
  const filters = parseFilters(params);
  const sort = parseSort(params);
  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '1') || 1;

  const problemSetsQueryResult = await problemSetService.findByFilter({
    user: session.user,
    filters: {
      include: filters.include,
      exclude: filters.exclude,
      topicMatchAll: filters.topicMatchAll,
      statuses: filters.statuses,
      creators: filters.creators,
      creatorMatchAll: filters.creatorMatchAll,
      bookmarked: filters.bookmarked,
      search
    },
    page,
    pageSize,
    sort: { by: sort.by as SortType, order: (sort.desc ? 'desc' : 'asc') as SortOrder },
    studentProgress: true
  });

  const problemSets = problemSetsQueryResult.problemSets.map((ps) => ({
    id: ps.id,
    title: ps.title,
    owners: ps.authors,
    description: ps.description || '',
    bookmarked: ps.bookmarked,
    progress: {
      finished: ps.studentProgress.finished,
      total: ps.studentProgress.total
    },
    subject: ps.subject,
    tags: [ps.difficulty, ...ps.topics].filter((t) => !!t)
  }));

  // Load the full tag universe (not just tags present in the current results) so
  // the filter browser always shows every available tag.
  const tagService = ServerRegistryProvider.instance().getService(TagService);
  const allTags = await tagService.findAll();
  const tagGroups = groupBy(allTags, (t) => t.type);

  // Full creator list (not just authors on the current page) so the creator
  // filter is complete and searchable regardless of the active result set.
  const creators = await problemSetService.findCreators(session.user);

  return {
    user: session.user,
    topicTags: (tagGroups['TopicTag'] ?? []).map((t) => t.model),
    difficultyTags: (tagGroups['DifficultyTag'] ?? []).map((t) => t.model),
    subjectTags: (tagGroups['SubjectTag'] ?? []).map((t) => t.model),
    creators,
    pagination: {
      pageCount: Math.ceil(problemSetsQueryResult.total / pageSize)
    },
    problemSets: problemSets
  };
};
