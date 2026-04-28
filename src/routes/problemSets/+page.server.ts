import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import type { CountArgs, FindManyArgs, WhereInput } from '@zenstackhq/orm';
import type { SchemaType } from '$lib/zenstack/schema';
import type { ProblemSet } from './api';
import { arrayToHashMap } from '$lib/utils/arrayToHashMap';

const pageSize = 12;

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) {
    redirect(302, '/about');
  }

  const tags = await db.tag.findMany({
    include: {
      _count: {
        select: {
          problemSets: {
            where: {
              problemSet: {
                OR: [
                  { is_global: true },
                  { subscriptions: { some: { student_id: session.user.id } } },
                  { owner_id: session.user.id }
                ]
              }
            }
          }
        }
      }
    },
    orderBy: [
      { type: 'asc' },
      { problemSets: { _count: 'desc' } },
      { order: 'asc' },
      { label: 'asc' }
    ]
  });

  const tagsMap = arrayToHashMap(tags, (t) => t.id);

  const creators =
    session.user.type === 'student'
      ? await db.teacher.findMany({
          select: { user: { select: { id: true, name: true } } },
          where: {
            problem_set: {
              some: {
                OR: [
                  { is_global: true },
                  { subscriptions: { some: { student_id: session.user.id } } }
                ]
              }
            }
          }
        })
      : [];

  const params = url.searchParams;
  let sortBy = params.get('sortBy') || '';
  if (['', 'problems_solved', 'problem_count', 'completion_pct', 'difficulty'].includes(sortBy))
    sortBy = '';
  const sortOrder = params.get('sortOrder') === 'desc' ? 'desc' : 'asc';

  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '1') || 1;

  const selectedTags = params.getAll('tag');
  let status = params.get('status') || '';
  if (['', 'not_started', 'in_progress', 'complete'].includes(status)) status = '';
  const creator = params.get('creator') || undefined;
  const bookmarked = params.get('bookmarked') === 'true';

  const problemSetWhere: WhereInput<SchemaType, 'ProblemSet'> = {
    OR: [{ is_global: true }, { subscriptions: { some: { student_id: session.user.id } } }]
  };

  let problemSetQuery = db.$qb
    .selectFrom((db) =>
      db
        .selectFrom('ProblemSet')
        .innerJoin('Teacher', 'Teacher.id', 'ProblemSet.owner_id')
        .innerJoin('User', 'User.id', 'Teacher.id')
        .leftJoin('ProblemSetTag', 'ProblemSetTag.problemSetId', 'ProblemSet.id')
        .leftJoin('Tag', 'Tag.id', 'ProblemSetTag.tagId')
        .innerJoin('Problem', 'Problem.problem_set_id', 'ProblemSet.id')
        .leftJoin('PracticeSession', 'PracticeSession.problem_id', 'Problem.id')
        .where((eb) =>
          eb.or([
            eb('PracticeSession.id', 'is', null),
            eb('PracticeSession.student_id', '=', String(session.user.id))
          ])
        )
        .groupBy(['ProblemSet.id', 'User.name', 'User.id'])
        .select('ProblemSet.id as id')
        .select('ProblemSet.title as title')
        .select('User.id as ownerId')
        .select('User.name as ownerName')
        .select('ProblemSet.description as description')
        .select((eb) =>
          eb.fn
            .count('Problem.id')
            .filterWhere((eb) => eb('PracticeSession.done', 'is not', null))
            .distinct()
            .as('progress_started')
        )
        .select((eb) =>
          eb.fn
            .count('Problem.id')
            .filterWhere((eb) => eb('PracticeSession.done', '=', true))
            .distinct()
            .as('progress_finished')
        )
        .select((eb) => eb.fn.count('Problem.id').distinct().as('progress_total'))
        .select((eb) =>
          eb(
            eb.cast<number>(
              eb.fn
                .count('Problem.id')
                .filterWhere((eb) => eb('PracticeSession.done', '=', true))
                .distinct(),
              'float8'
            ),
            '/',
            eb.cast<number>(eb.fn.count('Problem.id').distinct(), 'float8')
          ).as('progress_pct')
        )
        .select((eb) => eb.fn.agg<string[]>('array_agg', ['Tag.id']).as('tags'))
        .where('ProblemSet.title', 'like', `%${search}%`)
        .as('queryTable')
    )
    .select((eb) => eb.fn.countAll().over().as('total_count'))
    .select('id')
    .select('title')
    .select('ownerName')
    .select('description')
    .select('tags')
    .select('progress_finished')
    .select('progress_total');

  if (selectedTags.length !== 0) {
    problemSetQuery = problemSetQuery.where('tags', '&&', selectedTags);
  }

  if (creator && creator.length !== 0) {
    problemSetQuery = problemSetQuery.where('ownerId', '=', creator);
  }

  if (status === 'not_started') {
    problemSetQuery = problemSetQuery.where('progress_started', '=', 0);
  }

  if (status === 'in_progress') {
    problemSetQuery = problemSetQuery.where('progress_started', '<>', 0);
  }

  if (status === 'complete') {
    problemSetQuery = problemSetQuery.where('progress_pct', '=', 1);
  }

  if (sortBy === 'problems_solved') {
    problemSetQuery = problemSetQuery.orderBy('progress_finished', sortOrder);
  }

  if (sortBy === 'problem_count') {
    problemSetQuery = problemSetQuery.orderBy('progress_total', sortOrder);
  }

  if (sortBy === 'completion_pct') {
    problemSetQuery = problemSetQuery.orderBy('progress_pct', sortOrder);
  }

  console.log(problemSetQuery.compile().sql);
  console.log(await problemSetQuery.execute());

  const problemSetQueryResult = await problemSetQuery.execute();

  const problemSets: ProblemSet[] = problemSetQueryResult.map((ps) => ({
    id: ps.id,
    title: ps.title,
    ownerName: ps.ownerName || '',
    description: ps.description || '',
    progress: {
      finished: parseInt(String(ps.progress_finished)),
      total: parseInt(String(ps.progress_total))
    },
    bookmarked: true,
    tags: Array.from(new Set(ps.tags.filter((tag) => !!tag))).map((tag) => tagsMap[tag])
  }));

  // TODO: Implement Difficulty Sort

  return {
    user: session.user,
    tags,
    creators: creators.map((c) => c.user),
    pagination: {
      pageCount: Math.ceil(
        parseInt(String(problemSetQueryResult[0]?.total_count || '0')) / pageSize
      )
    },
    problemSets: problemSets
  };
};
