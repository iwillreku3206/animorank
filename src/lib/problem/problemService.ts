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

export class ProblemService {
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
        problem_set: {
          id: options.problemSetId,
          OR: [{ is_global: true }, { collaborators: { some: { collaborator_id: options.user.id || '' } } }]
        }
      }
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
        problem_set: {
          OR: [{ is_global: true }, { collaborators: { some: { collaborator_id: options.user.id || '' } } }]
        }
      }
    });

    if (!problem) return null;

    return new Problem(problem);
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
