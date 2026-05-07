import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import type { ProblemSet } from './api';
import { arrayToHashMap } from '$lib/utils/arrayToHashMap';

const pageSize = 12;

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) {
    redirect(302, '/about');
  }

  const topicTags = await db.topicTag.findMany({
    include: {
      _count: {
        select: {
          problem_sets: {
            where: {
              problem_set: {
                OR: [
                  { is_global: true },
                  { subscriptions: { some: { student_id: session.user.id } } },
                  { collaborators: { some: { collaborator_id: session.user.id } } }
                ]
              }
            }
          }
        }
      }
    },
    orderBy: [
      { type: 'asc' },
      { problem_sets: { _count: 'desc' } },
      { order: 'asc' },
      { label: 'asc' }
    ]
  });

  const topicTagsMap = arrayToHashMap(topicTags, (t) => t.id);

  const subjectTags = await db.subjectTag.findMany({
    include: {
      _count: {
        select: {
          problem_sets: {
            where: {
              OR: [
                { is_global: true },
                { subscriptions: { some: { student_id: session.user.id } } },
                { collaborators: { some: { collaborator_id: session.user.id } } }
              ]
            }
          }
        }
      }
    },
    orderBy: [
      { type: 'asc' },
      { problem_sets: { _count: 'desc' } },
      { order: 'asc' },
      { label: 'asc' }
    ]
  });

  const subjectTagsMap = arrayToHashMap(subjectTags, (t) => t.id);

  const difficultyTags = await db.difficultyTag.findMany({
    include: {
      _count: {
        select: {
          problem_sets: {
            where: {
              OR: [
                { is_global: true },
                { subscriptions: { some: { student_id: session.user.id } } },
                { collaborators: { some: { collaborator_id: session.user.id } } }
              ]
            }
          }
        }
      }
    },
    orderBy: [
      { type: 'asc' },
      { problem_sets: { _count: 'desc' } },
      { order: 'asc' },
      { label: 'asc' }
    ]
  });

  const difficultyTagsMap = arrayToHashMap(difficultyTags, (t) => t.id);

  const creators =
    session.user.type === 'student'
      ? await db.teacher.findMany({
          select: { user: { select: { id: true, name: true } } },
          where: {
            problem_set_collaborations: {
              some: {
                problem_set: {
                  OR: [
                    { is_global: true },
                    { subscriptions: { some: { student_id: session.user.id } } }
                  ]
                }
              }
            }
          }
        })
      : [];

  const params = url.searchParams;
  let sortBy = params.get('sortBy') || '';
  if (!['', 'problems_solved', 'problem_count', 'completion_pct', 'difficulty'].includes(sortBy))
    sortBy = '';
  const sortOrder = params.get('sortOrder') === 'desc' ? 'desc' : 'asc';

  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '1') || 1;

  const selectedTags = params.getAll('tag');
  let status = params.get('status') || '';
  if (!['', 'not_started', 'in_progress', 'complete'].includes(status)) status = '';
  const creator = params.get('creator') || undefined;
  const bookmarked = params.get('bookmarked') === 'true';

  let problemSetQuery = db.$qb
    .selectFrom((db) =>
      db
        .selectFrom('ProblemSet')
        .innerJoin(
          'ProblemSetCollaborator',
          'ProblemSetCollaborator.problem_set_id',
          'ProblemSet.id'
        )
        .innerJoin('Teacher', 'Teacher.id', 'ProblemSetCollaborator.collaborator_id')
        .innerJoin('User', 'User.id', 'Teacher.id')
        .leftJoin('ProblemSetBookmark', (join) =>
          join
            .onRef('ProblemSetBookmark.problem_set_id', '=', 'ProblemSet.id')
            .on('ProblemSetBookmark.user_id', '=', session.user.id || '')
        )
        .leftJoin('ProblemSetTopic', 'ProblemSetTopic.problem_set_id', 'ProblemSet.id')
        .leftJoin('TopicTag', 'TopicTag.id', 'ProblemSetTopic.topic_tag_id')
        .leftJoin('DifficultyTag', 'DifficultyTag.id', 'ProblemSet.difficulty_id')
        .leftJoin('Problem', 'Problem.problem_set_id', 'ProblemSet.id')
        .leftJoin('PracticeSession', (join) =>
          join
            .onRef('PracticeSession.problem_id', '=', 'Problem.id')
            .on('PracticeSession.student_id', '=', session.user.id || '')
        )
        .groupBy([
          'ProblemSet.id',
          'User.name',
          'User.id',
          'ProblemSetBookmark.user_id',
          'DifficultyTag.id'
        ])
        .select('ProblemSet.id as id')
        .select('ProblemSet.title as title')
        .select('User.id as ownerId')
        .select('User.name as ownerName')
        .select('ProblemSet.description as description')
        .select((eb) =>
          eb.fn
            .count('Problem.id')
            .filterWhere((eb) => eb('PracticeSession.done', 'is not', null))
            .filterWhere((eb) => eb('PracticeSession.student_id', '=', session.user.id || ''))
            .distinct()
            .as('progress_started')
        )
        .select((eb) =>
          eb.fn
            .count('Problem.id')
            .filterWhere((eb) => eb('PracticeSession.done', '=', true))
            .filterWhere((eb) => eb('PracticeSession.student_id', '=', session.user.id || ''))
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
                .filterWhere((eb) => eb('PracticeSession.student_id', '=', session.user.id || ''))
                .distinct(),
              'float8'
            ),
            '/',
            eb.cast<number>(eb.fn.count('Problem.id').distinct(), 'float8')
          ).as('progress_pct')
        )
        .select((eb) => eb.fn.agg<string[]>('array_agg', ['TopicTag.id']).as('topic_tags'))
        .select((eb) => eb.ref('ProblemSet.subject_id').as('subject_tag'))
        .select((eb) => eb.ref('ProblemSet.difficulty_id').as('difficulty_tag'))
        .select((eb) => eb.fn.coalesce('DifficultyTag.order', eb.val('-99')).as('difficulty_order'))
        .select((eb) => eb.ref('ProblemSetBookmark.user_id').as('bookmark_user_id'))
        .where('ProblemSet.title', 'like', `%${search}%`)
        .as('queryTable')
    )
    .select((eb) => eb.fn.countAll().over().as('total_count'))
    .select('id')
    .select('title')
    .select('ownerName')
    .select('description')
    .select('topic_tags')
    .select('subject_tag')
    .select('difficulty_tag')
    .select('progress_finished')
    .select('bookmark_user_id')
    .select('progress_total');

  if (bookmarked) {
    problemSetQuery = problemSetQuery.where('bookmark_user_id', 'is not', null);
  }

  if (selectedTags.length !== 0) {
    problemSetQuery = problemSetQuery.where((eb) =>
      eb.or([
        eb('topic_tags', '&&', eb.val(selectedTags)),
        eb('difficulty_tag', '=', eb.fn.any(eb.val(selectedTags))),
        eb('subject_tag', '=', eb.fn.any(eb.val(selectedTags)))
      ])
    );
  }

  if (creator && creator.length > 0) {
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

  if (sortBy === 'difficulty') {
    problemSetQuery = problemSetQuery.orderBy('difficulty_order', sortOrder);
  }

  problemSetQuery = problemSetQuery.limit(pageSize).offset((page - 1) * pageSize);
  console.log(problemSetQuery.compile().sql);

  const problemSetQueryResult = await problemSetQuery.execute();

  const problemSets: ProblemSet[] = problemSetQueryResult.map((ps) => ({
    id: ps.id,
    title: ps.title,
    ownerName: ps.ownerName || '',
    description: ps.description || '',
    bookmarked: ps.bookmark_user_id !== null,
    progress: {
      finished: parseInt(String(ps.progress_finished)),
      total: parseInt(String(ps.progress_total))
    },
    subject: ps.subject_tag ? subjectTagsMap[ps.subject_tag] : undefined,
    tags: Array.from(
      new Set(
        [
          ps.difficulty_tag ? difficultyTagsMap[ps.difficulty_tag] : undefined,
          ...ps.topic_tags.map((t) => topicTagsMap[t])
        ].filter((x) => !!x)
      )
    )
  }));

  return {
    user: session.user,
    topicTags,
    difficultyTags,
    subjectTags,
    creators: creators.map((c) => c.user),
    pagination: {
      pageCount: Math.ceil(
        parseInt(String(problemSetQueryResult[0]?.total_count || '0')) / pageSize
      )
    },
    problemSets: problemSets
  };
};
