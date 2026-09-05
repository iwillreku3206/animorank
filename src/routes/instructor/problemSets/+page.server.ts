import { ProblemSetService } from '$lib/problemSet';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { TagService } from '$lib/tag';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { SortOrder, SortType } from '$lib/problemSet/problemSetService';
import { groupBy } from '$lib/utils/groupBy';
import { parseFilters, parseSort } from '../../problemSets/filterUtils';

const pageSize = 12;

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return redirect(302, '/');
  if (session.user?.type !== 'teacher') return redirect(302, '/');

  const serviceProvider = ServerServiceProvider.instance();
  const problemSetService = serviceProvider.getService(ProblemSetService);

  const params = url.searchParams;
  // Parsed by the same helpers the student page uses, so the wire format is
  // defined once. The first draft hand-rolled this and passed `tags`/`status`/
  // `creator`, none of which `findByFilter` reads — those filters silently did
  // nothing, and generic inference on its options type hid it from tsc.
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
    studentProgress: false
  });

  const problemSets = problemSetsQueryResult.problemSets.map((ps) => ({
    id: ps.id,
    title: ps.title,
    owners: ps.authors,
    description: ps.description || '',
    bookmarked: ps.bookmarked,
    subject: ps.subject,
    problemCount: ps.problemCount,
    is_global: ps.is_global,
    tags: [ps.difficulty, ...ps.topics].filter((t) => !!t)
  }));

  // The full tag universe, not just the tags present in the current page of
  // results, so the filter panels always list every option.
  const tagService = serviceProvider.getService(TagService);
  const allTags = await tagService.findAll();
  const tagGroups = groupBy(allTags, (t) => t.type);

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
    problemSets
  };
};
