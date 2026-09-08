import { db } from '$lib/zenstack';
import { Language } from '$lib/zenstack/models';
import type { Problem as ProblemModel } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';
import { Problem } from '.';

export interface FindByProblemSetOptions {
  problemSetId: string;
  user: User;
}

export interface FindByIdOptions {
  id: string;
  user: User;
}

export interface FindNeighborsOptions {
  problem: Problem;
  user: User;
}

/** The problems either side of one problem, in problem-set order. */
export interface ProblemNeighbors {
  previous: Problem | null;
  next: Problem | null;
}

export interface CreateOptions {
  name: string;
  description: string;
  problemSetId: string;
  user: User;
  usesSlots?: boolean;
  starterCode?: string;
  language?: Language;
  subjectId?: string;
  difficultyId?: string;
  visible?: boolean;
}

/**
 * Every row a user is allowed to read: the problem's set has to be reachable
 * for them, and the problem itself has to be visible unless they collaborate on
 * that set. A hidden problem (`visible: false`) is delisted for students but
 * must stay reachable for the set's collaborators, who need to preview and edit
 * what they have hidden.
 *
 * Every read in this service composes this one clause, so a lookup added later
 * cannot accidentally hand back a problem that skipped the check.
 */
const readableByUser = (userId: string) => ({
  problem_set: {
    OR: [{ is_global: true }, { collaborators: { some: { collaborator_id: userId } } }]
  },
  OR: [{ visible: true }, { problem_set: { collaborators: { some: { collaborator_id: userId } } } }]
});

/**
 * The order problems take within their set. The set listing and the solve
 * view's previous/next controls both read this, because if they disagreed
 * "next" would land somewhere other than the row below the one the student
 * clicked. Names are not unique, hence the id tie-break: without it, equal
 * names sort arbitrarily and the two views drift apart.
 */
export const problemOrderInSet = () => [{ name: 'asc' as const }, { id: 'asc' as const }];

export class ProblemService {
  private static _instance: ProblemService | null;

  private constructor() {}

  public static instance(): ProblemService {
    if (!ProblemService._instance) {
      ProblemService._instance = new ProblemService();
    }
    return ProblemService._instance;
  }

  /**
   * Create a new problem.
   */
  public async create(options: CreateOptions): Promise<Problem | null> {
    const { name, description, problemSetId, usesSlots, starterCode, language, subjectId, difficultyId, visible } =
      options;

    const problem = await db.problem.create({
      data: {
        name,
        description,
        problem_set: { connect: { id: problemSetId } },
        uses_slots: usesSlots ?? false,
        starter_code: starterCode ?? '',
        language: language ?? Language.C,
        visible: visible ?? true,
        ...((subjectId ? { subject_id: subjectId } : {}) as Partial<Record<string, unknown>>),
        ...((difficultyId ? { difficulty_id: difficultyId } : {}) as Partial<Record<string, unknown>>)
      }
    });

    return new Problem(problem);
  }

  /**
   * Find problems within a problem set that the user has access to.
   */
  public async findByProblemSet(options: FindByProblemSetOptions): Promise<Problem[]> {
    const problems = await db.problem.findMany({
      where: {
        problem_set_id: options.problemSetId,
        ...readableByUser(options.user.id || '')
      },
      orderBy: problemOrderInSet()
    });

    return problems.map((problem) => new Problem(problem));
  }

  /**
   * Find a single problem by ID if the user has access.
   */
  public async findById(options: FindByIdOptions): Promise<Problem | null> {
    const problem = await db.problem.findUnique({
      where: {
        id: options.id,
        ...readableByUser(options.user.id || '')
      }
    });

    if (!problem) return null;

    return new Problem(problem);
  }

  public async findNeighbors(options: FindNeighborsOptions): Promise<ProblemNeighbors> {
    const siblings = await db.problem.findMany({
      where: {
        problem_set_id: options.problem.problem_set_id,
        ...readableByUser(options.user.id || '')
      },
      orderBy: problemOrderInSet()
    });

    const index = siblings.findIndex((sibling) => sibling.id === options.problem.id);
    if (index === -1) return { previous: null, next: null };

    const at = (position: number) => (siblings[position] ? new Problem(siblings[position]) : null);

    return { previous: at(index - 1), next: at(index + 1) };
  }

  /**
   * Update a problem.
   */
  public async update(id: string, updates: Partial<ProblemModel>): Promise<Problem | null> {
    const existing = await db.problem.findUnique({
      where: { id }
    });

    if (!existing) return null;

    const updated = await db.problem.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.language !== undefined && { language: updates.language }),
        ...(updates.starter_code !== undefined && { starter_code: updates.starter_code }),
        ...(updates.visible !== undefined && { visible: updates.visible }),
        ...(updates.uses_slots !== undefined && { uses_slots: updates.uses_slots }),
        ...(updates.difficulty_id !== undefined && { difficulty_id: updates.difficulty_id }),
        ...(updates.subject_id !== undefined && { subject_id: updates.subject_id }),
        // extension_data is a required Json column: null means "no change"
        ...(updates.extension_data != null && { extension_data: updates.extension_data })
      }
    });

    return new Problem(updated);
  }

  /**
   * Delete a problem and all its associated test cases.
   */
  public async delete(id: string): Promise<boolean> {
    try {
      await db.problem.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }
}
