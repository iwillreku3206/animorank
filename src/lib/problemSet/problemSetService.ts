import { db } from '$lib/zenstack';
import type {
  DifficultyTag,
  ProblemSet as ProblemSetModel,
  SubjectTag,
  TopicTag,
  Tag as TagModel
} from '$lib/zenstack/models';
import { TagType } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';
import { ProblemSet, type CollaboratorInfo, type ProblemSetSummary } from '.';
import { ServerRegistryProvider } from '$lib/registry/server';
import { Tag, TagService } from '$lib/tag';
import { arrayToHashMap } from '$lib/utils/arrayToHashMap';

export interface CreateOptions {
  title: string;
  description?: string;
  is_global?: boolean;
  auto_accept?: boolean;
  subjectId?: string;
  difficultyId?: string;
  topicIds?: string[];
  collaboratorId: string;
}

export interface FindByIdOptions {
  id: string;
  user: User;
}

export interface UpdateOptions {
  id: string;
  user: User;
  data: Partial<ProblemSetModel>;
}

export interface DeleteOptions {
  id: string;
  user: User;
}

export interface AddCollaboratorOptions {
  problemSetId: string;
  collaboratorId: string;
  user: User;
}

export interface RemoveCollaboratorOptions {
  problemSetId: string;
  collaboratorId: string;
  user: User;
}

export interface ListCollaboratorsOptions {
  problemSetId: string;
  user: User;
}

export type FilterStatus = 'not_started' | 'in_progress' | 'complete';

export type SortType = 'problems_solved' | 'problem_count' | 'completion_pct' | 'difficulty';

export type SortOrder = 'asc' | 'desc';

/** Maps each sort key to the query column it orders by. */
const SORT_COLUMN = {
  problems_solved: 'progress_finished',
  problem_count: 'problem_count',
  completion_pct: 'progress_pct',
  difficulty: 'difficulty_order'
} as const satisfies Record<SortType, string>;

export interface FindByFilterOptions {
  user: User;
  page?: number;
  pageSize?: number;
  filters?: {
    search?: string;
    include?: string[];
    exclude?: string[];
    topicMatchAll?: boolean;
    statuses?: FilterStatus[];
    creators?: string[];
    creatorMatchAll?: boolean;
    bookmarked?: boolean;
  };
  sort?: {
    by: SortType;
    order: SortOrder;
  };
  studentProgress?: boolean;
}

export type StudentProgress = { finished: number; total: number };

/**
 * Prisma `where` fragment matching problem sets the user may read: global sets,
 * sets they are subscribed to, or sets they collaborate on.
 */
function readableBy(userId: string) {
  return {
    OR: [
      { is_global: true },
      { subscriptions: { some: { student_id: userId } } },
      { collaborators: { some: { collaborator_id: userId } } }
    ]
  };
}

/** Prisma `where` fragment matching problem sets the user collaborates on (and may edit). */
function editableBy(userId: string) {
  return { collaborators: { some: { collaborator_id: userId } } };
}

export class ProblemSetService {
  /**
   * Create a new problem set.
   */
  public async create(options: CreateOptions): Promise<ProblemSet | null> {
    const topicData = options.topicIds
      ? { create: options.topicIds.map((tagId) => ({ topic_tag: { connect: { id: tagId } } })) }
      : undefined;

    const problemSet = await db.problemSet.create({
      data: {
        title: options.title,
        description: options.description ?? '',
        is_global: options.is_global ?? false,
        auto_accept: options.auto_accept ?? false,
        subject: options.subjectId ? { connect: { id: options.subjectId } } : undefined,
        difficulty: options.difficultyId ? { connect: { id: options.difficultyId } } : undefined,
        topics: topicData,
        collaborators: {
          create: {
            collaborator: { connect: { id: options.collaboratorId } }
          }
        }
      },
      include: {
        subject: true,
        difficulty: true,
        topics: { include: { topic_tag: true } }
      }
    });

    return new ProblemSet(problemSet);
  }

  /**
   * Find a problem set by ID with all related data.
   * Returns null if the user has no access.
   */
  public async findById(options: FindByIdOptions): Promise<ProblemSet | null> {
    const problemSet = await db.problemSet.findUnique({
      where: {
        id: options.id,
        ...readableBy(options.user.id || '')
      },
      include: {
        problems: {
          include: {
            test_cases: true,
            difficulty: true,
            subject: true,
            topics: { include: { tag: true } }
          }
        },
        collaborators: { include: { collaborator: { include: { user: true } } } },
        difficulty: true,
        subject: true,
        topics: { include: { topic_tag: true } }
      }
    });

    if (!problemSet) return null;

    return new ProblemSet(problemSet);
  }

  /**
   * Update a problem set (must be a collaborator).
   */
  public async update(options: UpdateOptions): Promise<ProblemSet | null> {
    const existing = await db.problemSet.findUnique({
      where: {
        id: options.id,
        ...editableBy(options.user.id || '')
      }
    });

    if (!existing) return null;

    const updated = await db.problemSet.update({
      where: { id: options.id },
      data: options.data,
      include: {
        subject: true,
        difficulty: true,
        topics: { include: { topic_tag: true } }
      }
    });

    return new ProblemSet(updated);
  }

  /**
   * Delete a problem set (must be a collaborator).
   */
  public async delete(options: DeleteOptions): Promise<boolean> {
    try {
      await db.problemSet.delete({
        where: {
          id: options.id,
          ...editableBy(options.user.id || '')
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add a teacher as a collaborator on a problem set.
   */
  public async addCollaborator(options: AddCollaboratorOptions): Promise<boolean> {
    const problemSet = await db.problemSet.findUnique({
      where: {
        id: options.problemSetId,
        ...editableBy(options.user.id || '')
      }
    });

    if (!problemSet) return false;

    await db.problemSetCollaborator.create({
      data: {
        collaborator: { connect: { id: options.collaboratorId } },
        problem_set: { connect: { id: options.problemSetId } }
      }
    });

    return true;
  }

  /**
   * Remove a teacher from the collaborators of a problem set.
   */
  public async removeCollaborator(options: RemoveCollaboratorOptions): Promise<boolean> {
    try {
      await db.problemSetCollaborator.delete({
        where: {
          collaborator_id_problem_set_id: {
            collaborator_id: options.collaboratorId,
            problem_set_id: options.problemSetId
          }
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all collaborators of a problem set.
   */
  public async listCollaborators(options: ListCollaboratorsOptions): Promise<CollaboratorInfo[]> {
    const problemSet = await db.problemSet.findUnique({
      where: {
        id: options.problemSetId,
        ...readableBy(options.user.id || '')
      },
      include: {
        collaborators: { include: { collaborator: { include: { user: true } } } }
      }
    });

    if (!problemSet) return [];

    return problemSet.collaborators.map((c) => ({
      id: c.collaborator.user.id,
      name: c.collaborator.user.name
    }));
  }

  /**
   * List the distinct creators (collaborators) of all problem sets the user can
   * read, for the creator filter. Loaded in full and searched client-side; if the
   * teacher catalog grows large, switch to a server-side search endpoint.
   */
  public async findCreators(user: User): Promise<{ id: string; name: string }[]> {
    const teachers = await db.teacher.findMany({
      where: {
        problem_set_collaborations: { some: { problem_set: readableBy(user.id || '') } }
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: 'asc' } }
    });

    return teachers.map((t) => ({ id: t.user.id, name: t.user.name ?? 'Unknown' }));
  }

  /**
   * Find problem sets accessible to the user with optional filtering.
   */
  public async findByFilter<O extends FindByFilterOptions>(
    options: O
  ): Promise<{
    problemSets: (ProblemSetSummary &
      (O extends { studentProgress: true } ? { studentProgress: StudentProgress } : unknown))[];
    tags: Record<string, Tag<TagModel>>;
    total: number;
  }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 12;

    const includeIds = options.filters?.include ?? [];
    const excludeIds = options.filters?.exclude ?? [];
    const topicMatchAll = options.filters?.topicMatchAll ?? false;

    // Resolve each selected tag id to its type so it can be applied to the right
    // column (subject/difficulty are single-valued; topics are an array).
    let tagTypeById = new Map<string, TagType>();
    if (includeIds.length || excludeIds.length) {
      const filterTags = await db.tag.findMany({
        where: { id: { in: [...includeIds, ...excludeIds] } }
      });
      tagTypeById = new Map(filterTags.map((t) => [t.id, t.type]));
    }
    const ofType = (ids: string[], type: TagType) => ids.filter((id) => tagTypeById.get(id) === type);

    const subjInc = ofType(includeIds, TagType.SubjectTag);
    const subjExc = ofType(excludeIds, TagType.SubjectTag);
    const diffInc = ofType(includeIds, TagType.DifficultyTag);
    const diffExc = ofType(excludeIds, TagType.DifficultyTag);
    const topicInc = ofType(includeIds, TagType.TopicTag);
    const topicExc = ofType(excludeIds, TagType.TopicTag);

    let query = db.$qbRaw
      .with('topics', (db) =>
        db
          .selectFrom('ProblemSet')
          .leftJoin('ProblemSetTopic', 'ProblemSetTopic.problem_set_id', 'ProblemSet.id')
          .groupBy('ProblemSet.id')
          .select('ProblemSet.id')
          .select((eb) => eb.fn<string[]>('array_agg', ['ProblemSetTopic.topic_tag_id']).as('topic_tags'))
      )
      .with('problem_progress', (db) =>
        db
          .selectFrom('Problem')
          .select('Problem.id')
          .select((eb) =>
            eb
              .case()
              .when(
                eb.exists((eb) =>
                  eb
                    .selectFrom('PracticeSession')
                    .whereRef('PracticeSession.problem_id', '=', 'Problem.id')
                    .where('PracticeSession.student_id', '=', options.user.id || '')
                    .where('PracticeSession.done', '=', eb.lit(true))
                    .selectAll()
                )
              )
              .then('finished')
              .when(
                eb.exists((eb) =>
                  eb
                    .selectFrom('PracticeSession')
                    .whereRef('PracticeSession.problem_id', '=', 'Problem.id')
                    .where('PracticeSession.student_id', '=', options.user.id || '')
                    .where('PracticeSession.done', '=', eb.lit(false))
                    .selectAll()
                )
              )
              .then('unfinished')
              .else('unstarted')
              .end()
              .as('progress')
          )
      )
      .with('solved_amounts', (db) =>
        db
          .selectFrom('ProblemSet')
          .innerJoin('Problem', 'Problem.problem_set_id', 'ProblemSet.id')
          .innerJoin('problem_progress', 'problem_progress.id', 'Problem.id')
          .groupBy('ProblemSet.id')
          .select('ProblemSet.id')
          .select((eb) =>
            eb.fn
              .sum(eb.case().when('problem_progress.progress', '=', 'finished').then(1).else(0).end())
              .as('count_finished')
          )
          .select((eb) =>
            eb.fn
              .sum(eb.case().when('problem_progress.progress', '=', 'unfinished').then(1).else(0).end())
              .as('count_unfinished')
          )
          .select((eb) =>
            eb.fn
              .sum(eb.case().when('problem_progress.progress', '=', 'unstarted').then(1).else(0).end())
              .as('count_unstarted')
          )
          .select((eb) => eb.fn.count('Problem.id').as('count_total'))
      )
      .with('progress_pct', (db) =>
        db
          .selectFrom('solved_amounts')
          .select('id')
          .select((eb) => eb(eb.cast(eb.ref('count_finished'), 'real'), '/', eb.ref('count_total')).as('progress_pct'))
      )
      .with('problem_count', (db) =>
        db
          .selectFrom('ProblemSet')
          .leftJoin('Problem', 'ProblemSet.id', 'Problem.problem_set_id')
          .groupBy('ProblemSet.id')
          .select('ProblemSet.id')
          .select((eb) => eb.fn.count('Problem.id').as('problem_count'))
      )
      .with('collaborators_agg', (db) =>
        db
          .selectFrom('ProblemSet')
          .innerJoin('ProblemSetCollaborator', 'ProblemSetCollaborator.problem_set_id', 'ProblemSet.id')
          .innerJoin('Teacher', 'ProblemSetCollaborator.collaborator_id', 'Teacher.id')
          .innerJoin('User', 'Teacher.id', 'User.id')
          .select('ProblemSet.id')
          .select((eb) => eb.fn.agg<string[]>('json_build_array', ['User.id', 'User.name']).as('collaborators'))
      )
      .with('collaborators', (db) =>
        db
          .selectFrom('ProblemSet')
          .innerJoin('collaborators_agg', 'ProblemSet.id', 'collaborators_agg.id')
          .groupBy('ProblemSet.id')
          .select('ProblemSet.id')
          .select((eb) => eb.fn.jsonAgg('collaborators_agg.collaborators').as('collaborators'))
      )
      .with('bookmarked', (db) =>
        db
          .selectFrom('ProblemSet')
          .leftJoin('ProblemSetBookmark', (join) =>
            join
              .onRef('ProblemSet.id', '=', (eb) => eb.ref('ProblemSetBookmark.problem_set_id'))
              .on('ProblemSetBookmark.user_id', '=', options.user.id || '')
          )
          .select('ProblemSet.id')
          .select((eb) =>
            eb.case().when('ProblemSetBookmark.user_id', 'is', null).then(false).else(true).end().as('bookmarked')
          )
      )
      .with('difficulty_order', (db) =>
        db
          .selectFrom('ProblemSet')
          .leftJoin('DifficultyTag', 'DifficultyTag.id', 'ProblemSet.difficulty_id')
          .leftJoin('Tag', 'Tag.id', 'DifficultyTag.id')
          .select('ProblemSet.id')
          .select((eb) => eb.fn.coalesce('Tag.order', eb.val('-99')).as('difficulty_order'))
      )
      .selectFrom('ProblemSet')
      .innerJoin('topics', 'ProblemSet.id', 'topics.id')
      .innerJoin('solved_amounts', 'ProblemSet.id', 'solved_amounts.id')
      .innerJoin('progress_pct', 'ProblemSet.id', 'progress_pct.id')
      .innerJoin('problem_count', 'problem_count.id', 'ProblemSet.id')
      .innerJoin('collaborators', 'collaborators.id', 'ProblemSet.id')
      .innerJoin('bookmarked', 'bookmarked.id', 'ProblemSet.id')
      .innerJoin('difficulty_order', 'difficulty_order.id', 'ProblemSet.id')
      .select((eb) => eb.fn.countAll().over().as('total_count'))
      .select('ProblemSet.id')
      .select('ProblemSet.title')
      .select('collaborators.collaborators')
      .select('ProblemSet.description')
      .select('ProblemSet.auto_accept')
      .select('ProblemSet.is_global')
      .select('bookmarked.id')
      .select((eb) => eb.ref('solved_amounts.count_finished').as('progress_finished'))
      .select((eb) => eb.ref('solved_amounts.count_unfinished').as('progress_unfinished'))
      .select((eb) => eb.ref('solved_amounts.count_unstarted').as('progress_unstarted'))
      .select((eb) =>
        eb(
          eb(eb.ref('solved_amounts.count_unfinished'), '+', eb.ref('solved_amounts.count_finished')),
          '+',
          eb.ref('solved_amounts.count_unstarted')
        ).as('progress_total')
      )
      .select('ProblemSet.subject_id')
      .select('ProblemSet.difficulty_id')
      .select('topics.topic_tags')
      .select('problem_count.problem_count')
      .select('bookmarked.bookmarked');

    // Restrict to problem sets the user may read: global, subscribed to, or
    // collaborating on.
    query = query.where((eb) =>
      eb.or([
        eb('ProblemSet.is_global', '=', eb.lit(true)),
        eb.exists(
          eb
            .selectFrom('Subscription')
            .whereRef('Subscription.problem_set_id', '=', 'ProblemSet.id')
            .where('Subscription.student_id', '=', options.user.id || '')
            .select('Subscription.problem_set_id')
        ),
        eb.exists(
          eb
            .selectFrom('ProblemSetCollaborator')
            .whereRef('ProblemSetCollaborator.problem_set_id', '=', 'ProblemSet.id')
            .where('ProblemSetCollaborator.collaborator_id', '=', options.user.id || '')
            .select('ProblemSetCollaborator.problem_set_id')
        )
      ])
    );

    if (options.filters?.bookmarked) {
      query = query.where((eb) => eb('bookmarked.bookmarked', '=', eb.lit(true)));
    }

    if (options.filters?.search) {
      // NOTE: `ilike '%term%'` cannot use a btree index and will table-scan. Fine at
      // the current catalog size; if problem sets grow large, switch to a pg_trgm
      // GIN index or full-text search (tsvector) on title/description.
      // Escape LIKE metacharacters so a literal % or _ in the query matches
      // literally instead of acting as a wildcard (\ is ilike's default escape).
      const escaped = options.filters.search.replace(/[\\%_]/g, (c) => `\\${c}`);
      const term = `%${escaped}%`;
      query = query.where((eb) =>
        eb.or([eb('ProblemSet.title', 'ilike', term), eb('ProblemSet.description', 'ilike', term)])
      );
    }

    const hasTagFilter =
      subjInc.length || subjExc.length || diffInc.length || diffExc.length || topicInc.length || topicExc.length;

    if (hasTagFilter) {
      // Categories are AND-ed together; subject/difficulty includes are OR (IN),
      // topic includes are OR (&&) or AND (@>) depending on topicMatchAll.
      query = query.where((eb) =>
        eb.and([
          ...(subjInc.length ? [eb('subject_id', 'in', subjInc)] : []),
          ...(subjExc.length ? [eb.or([eb('subject_id', 'is', null), eb('subject_id', 'not in', subjExc)])] : []),
          ...(diffInc.length ? [eb('difficulty_id', 'in', diffInc)] : []),
          ...(diffExc.length ? [eb.or([eb('difficulty_id', 'is', null), eb('difficulty_id', 'not in', diffExc)])] : []),
          ...(topicInc.length ? [eb('topics.topic_tags', topicMatchAll ? '@>' : '&&', eb.val(topicInc))] : []),
          ...(topicExc.length ? [eb.not(eb('topics.topic_tags', '&&', eb.val(topicExc)))] : [])
        ])
      );
    }

    const creators = options.filters?.creators ?? [];
    const creatorMatchAll = options.filters?.creatorMatchAll ?? false;
    if (creators.length) {
      // OR: authored by any selected creator. AND (match-all): co-authored by all.
      query = query.where((eb) => {
        const preds = creators.map((id) =>
          eb.exists(
            eb
              .selectFrom('ProblemSetCollaborator')
              .innerJoin('Teacher', 'Teacher.id', 'ProblemSetCollaborator.collaborator_id')
              .innerJoin('User', 'User.id', 'Teacher.id')
              .whereRef('ProblemSetCollaborator.problem_set_id', '=', 'ProblemSet.id')
              .where('User.id', '=', id)
              .select('ProblemSetCollaborator.problem_set_id')
          )
        );
        return creatorMatchAll ? eb.and(preds) : eb.or(preds);
      });
    }

    const statuses = options.filters?.statuses ?? [];
    if (statuses.length) {
      // Each selected status is OR-ed: a set matches if it is in any of them.
      query = query.where((eb) =>
        eb.or(
          statuses.map((status) => {
            switch (status) {
              case 'not_started':
                return eb(eb('count_unfinished', '+', eb.ref('count_finished')), '=', eb.lit(0));
              case 'in_progress':
                return eb.and([
                  eb(eb('count_finished', '+', eb.ref('count_unfinished')), '<>', eb.lit(0)),
                  eb('count_finished', '<>', eb.ref('solved_amounts.count_total'))
                ]);
              case 'complete':
                return eb('count_finished', '=', eb.ref('solved_amounts.count_total'));
            }
          })
        )
      );
    }

    const sortColumn = options.sort?.by ? SORT_COLUMN[options.sort.by] : undefined;
    if (sortColumn) {
      query = query.orderBy(sortColumn, options.sort?.order || 'asc');
    }

    query = query.limit(pageSize).offset((page - 1) * pageSize);

    const queryResult = await query.execute();

    const tagIds = queryResult
      .reduce((arr, problemSet) => {
        if (problemSet.subject_id) arr.push(problemSet.subject_id);
        if (problemSet.difficulty_id) arr.push(problemSet.difficulty_id);
        for (const tag of problemSet.topic_tags || []) arr.push(tag);

        return arr;
      }, [] as string[])
      .filter((tag) => !!tag);

    const tagsArr = await (await ServerRegistryProvider.instance().getService(TagService)).findByIds(tagIds);
    const tags = arrayToHashMap(tagsArr, (t) => t.id);

    type Summary = ProblemSetSummary & { studentProgress?: StudentProgress };
    const problemSetsSummaries: Summary[] = queryResult.map((ps): Summary => {
      const summary: Summary = {
        id: ps.id,
        title: ps.title,
        description: ps.description || undefined,
        auto_accept: ps.auto_accept,
        is_global: ps.is_global,
        subject: ps.subject_id ? (tags[ps.subject_id].model as SubjectTag) : undefined,
        difficulty: ps.difficulty_id ? (tags[ps.difficulty_id].model as DifficultyTag) : undefined,
        topics: ps.topic_tags
          .map((t: string) => tags[t]?.model as TopicTag | undefined)
          .filter((t: TopicTag | undefined): t is TopicTag => !!t),
        problemCount: Number(ps.problem_count),
        authors:
          ps.collaborators?.map((c: [string, string]) => ({
            id: c[0],
            name: c[1]
          })) || [],
        bookmarked: ps.bookmarked
      };

      if (options.studentProgress) {
        summary.studentProgress = {
          finished: Number(ps.progress_finished),
          total: Number(ps.progress_total)
        };
      }

      return summary;
    });

    return {
      // The generic conditional return type can only be satisfied at this boundary
      // via a cast; studentProgress presence is guaranteed by options.studentProgress.
      problemSets: problemSetsSummaries as (ProblemSetSummary &
        (O extends { studentProgress: true } ? { studentProgress: StudentProgress } : unknown))[],
      tags: tags,
      total: Number(queryResult[0]?.total_count ?? 0)
    };
  }
}
