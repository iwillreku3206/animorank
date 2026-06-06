import { db } from '$lib/zenstack';
import type {
  DifficultyTag,
  ProblemSet as ProblemSetModel,
  SubjectTag,
  TopicTag,
  Tag as TagModel
} from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';
import { ProblemSet, type CollaboratorInfo, type ProblemSetSummary } from '.';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { Tag, TagService } from '$lib/tag';
import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
import fs from 'fs/promises';

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

export interface FindByFilterOptions {
  user: User;
  page?: number;
  pageSize?: number;
  filters?: {
    search?: string;
    tags?: string[];
    status?: FilterStatus;
    creator?: string;
    bookmarked?: boolean;
  };
  sort?: {
    by: SortType;
    order: SortOrder;
  };
  studentProgress?: boolean;
}

export type StudentProgress = { finished: number; total: number };

export class ProblemSetService {
  private static _instance: ProblemSetService | null;

  private constructor() {}

  public static instance(): ProblemSetService {
    if (!ProblemSetService._instance) {
      ProblemSetService._instance = new ProblemSetService();
    }
    return ProblemSetService._instance;
  }

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
        OR: [
          { is_global: true },
          { subscriptions: { some: { student_id: options.user.id || '' } } },
          { collaborators: { some: { collaborator_id: options.user.id || '' } } }
        ]
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
        collaborators: { some: { collaborator_id: options.user.id || '' } }
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
          collaborators: { some: { collaborator_id: options.user.id || '' } }
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
        collaborators: { some: { collaborator_id: options.user.id || '' } }
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
        OR: [
          { is_global: true },
          { subscriptions: { some: { student_id: options.user.id || '' } } },
          { collaborators: { some: { collaborator_id: options.user.id || '' } } }
        ]
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
   * Find problem sets accessible to the user with optional filtering.
   */
  public async findByFilter<O extends FindByFilterOptions>(
    options: O
  ): Promise<{
    problemSets: (ProblemSetSummary &
      (O extends { studentProgress: true } ? { studentProgress: StudentProgress } : void))[];
    tags: Record<string, Tag<TagModel>>;
    total: number;
  }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 12;

    let query = db.$qbRaw
      .with('topics', (db) =>
        db
          .selectFrom('ProblemSet')
          .leftJoin('ProblemSetTopic', 'ProblemSetTopic.problem_set_id', 'ProblemSet.id')
          .groupBy('ProblemSet.id')
          .select('ProblemSet.id')
          .select((eb) =>
            eb.fn<string[]>('array_agg', ['ProblemSetTopic.topic_tag_id']).as('topic_tags')
          )
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
              .sum(
                eb.case().when('problem_progress.progress', '=', 'finished').then(1).else(0).end()
              )
              .as('count_finished')
          )
          .select((eb) =>
            eb.fn
              .sum(
                eb.case().when('problem_progress.progress', '=', 'unfinished').then(1).else(0).end()
              )
              .as('count_unfinished')
          )
          .select((eb) =>
            eb.fn
              .sum(
                eb.case().when('problem_progress.progress', '=', 'unstarted').then(1).else(0).end()
              )
              .as('count_unstarted')
          )
          .select((eb) => eb.fn.count('Problem.id').as('count_total'))
      )
      .with('progress_pct', (db) =>
        db
          .selectFrom('solved_amounts')
          .select('id')
          .select((eb) =>
            eb(eb.ref('count_finished'), '/', eb.ref('count_total')).as('progress_pct')
          )
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
          .innerJoin(
            'ProblemSetCollaborator',
            'ProblemSetCollaborator.problem_set_id',
            'ProblemSet.id'
          )
          .innerJoin('Teacher', 'ProblemSetCollaborator.collaborator_id', 'Teacher.id')
          .innerJoin('User', 'Teacher.id', 'User.id')
          .select('ProblemSet.id')
          .select((eb) =>
            eb.fn.agg<string[]>('json_build_array', ['User.id', 'User.name']).as('collaborators')
          )
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
            eb
              .case()
              .when('ProblemSetBookmark.user_id', 'is', null)
              .then(false)
              .else(true)
              .end()
              .as('bookmarked')
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
          eb(
            eb.ref('solved_amounts.count_unfinished'),
            '+',
            eb.ref('solved_amounts.count_finished')
          ),
          '+',
          eb.ref('solved_amounts.count_unstarted')
        ).as('progress_total')
      )
      .select('ProblemSet.subject_id')
      .select('ProblemSet.difficulty_id')
      .select('topics.topic_tags')
      .select('problem_count.problem_count')
      .select('bookmarked.bookmarked');

    if (options.filters?.bookmarked) {
      query = query.where((eb) => eb('bookmarked.bookmarked', '=', eb.lit(true)));
    }

    if (
      typeof options.filters !== 'undefined' &&
      options.filters.tags &&
      options.filters.tags.length !== 0
    ) {
      query = query.where((eb) =>
        eb.or([
          eb('topics.topic_tags', '&&', eb.val(options.filters!.tags)),
          eb('difficulty_id', '=', eb.fn.any(eb.val(options.filters!.tags))),
          eb('subject_id', '=', eb.fn.any(eb.val(options.filters!.tags)))
        ])
      );
    }

    if (options.filters && options.filters?.creator) {
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('ProblemSetCollaborator')
            .innerJoin('Teacher', 'Teacher.id', 'ProblemSetCollaborator.collaborator_id')
            .innerJoin('User', 'User.id', 'Teacher.id')
            .whereRef('ProblemSetCollaborator.problem_set_id', '=', 'ProblemSet.id')
            .where('User.id', '=', options.filters!.creator!)
            .select('ProblemSetCollaborator.problem_set_id')
        )
      );
    }

    if (options.filters?.status === 'not_started') {
      query = query.where((eb) =>
        eb(eb('count_unfinished', '+', eb.ref('count_finished')), '=', eb.lit(0))
      );
    }

    if (options.filters?.status === 'in_progress') {
      query = query.where((eb) =>
        eb(eb('count_finished', '+', eb.ref('count_unfinished')), '<>', eb.lit(0))
      );
    }

    if (options.filters?.status === 'complete') {
      query = query.where((eb) => eb('progress_pct.progress_pct', '=', '1'));
    }

    if (options.sort?.by === 'problems_solved') {
      query = query.orderBy('progress_finished', options.sort?.order || 'asc');
    }

    if (options.sort?.by === 'problem_count') {
      query = query.orderBy('problem_count', options.sort?.order || 'asc');
    }

    if (options.sort?.by === 'completion_pct') {
      query = query.orderBy('progress_pct', options.sort?.order || 'asc');
    }

    if (options.sort?.by === 'completion_pct') {
      query = query.orderBy('difficulty_order', options.sort?.order || 'asc');
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

    const tagsArr = await ServerServiceProvider.instance().getService(TagService).findByIds(tagIds);
    const tags = arrayToHashMap(tagsArr, (t) => t.id);

    const problemSetsSummaries: ReturnType<typeof this.findByFilter>['summaries'] = queryResult.map(
      (ps) => {
        const summary = {
          id: ps.id,
          title: ps.title,
          description: ps.description || undefined,
          auto_accept: ps.auto_accept,
          is_global: ps.is_global,
          subject: ps.subject_id ? (tags[ps.subject_id].model as SubjectTag) : undefined,
          difficulty: ps.difficulty_id
            ? (tags[ps.difficulty_id].model as DifficultyTag)
            : undefined,
          topics: ps.topic_tags
            .map((t: string) => tags[t]?.model as TopicTag | undefined)
            .filter((t: string) => !!t) as TopicTag[],
          problemCount: Number(ps.problem_count),
          authors:
            ps.collaborators?.map((c: [string, string]) => ({
              id: c[0],
              name: c[1]
            })) || [],
          bookmarked: ps.bookmarked
        };

        if (options.studentProgress) {
          (summary as ProblemSetSummary & { studentProgress: StudentProgress }).studentProgress = {
            finished: Number(ps.progress_finished),
            total: Number(ps.progress_total)
          };
        }

        return summary;
      }
    );

    return {
      problemSets: problemSetsSummaries,
      tags: tags,
      total: Number(String(queryResult[0]?.total_count || '0'))
    };
  }
}
