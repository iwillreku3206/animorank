import { db } from '$lib/zenstack';
import type { Problem as ProblemModel } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';
import { PracticeSession, type PracticeSessionData } from './index.svelte.ts';
import { Problem } from '$lib/problem';
import { ProblemService } from '$lib/problem/problemService';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import type { PracticeSession as PracticeSessionModel } from '$lib/zenstack/models';
import { arrayToHashMap } from '$lib/utils/arrayToHashMap.ts';

export interface FindByOptions {
  user: User;
  problemId?: string;
}

export interface FindByIdOptions {
  id: string;
  user: User;
}

export interface CreateOptions {
  user: User;
  problemId: string;
}

export interface FindLatestNonDoneOptions {
  user: User;
  problemId: string;
}

export class PracticeSessionService {
  private static _instance: PracticeSessionService | null;

  private constructor() {}

  public static instance(): PracticeSessionService {
    if (!PracticeSessionService._instance) {
      PracticeSessionService._instance = new PracticeSessionService();
    }
    return PracticeSessionService._instance;
  }

  /**
   * Create a new practice session.
   */
  public async create(options: CreateOptions): Promise<ServerPracticeSession | null> {
    const problem = await ProblemService.instance().findById({
      id: options.problemId,
      user: options.user
    });

    if (!problem) return null;

    const problemSlots = arrayToHashMap(problem.getDefaultSections(), (s) => s.slot.label);
    const state = problem.uses_slots
      ? problem
          .getSlots()
          .map((s) => s.label)
          .reduce(
            (prev, s) => {
              prev[s] = problemSlots[s].code;
              return prev;
            },
            {} as Record<string, string>
          )
      : { body: problem.starter_code };

    const practiceSession = await db.practiceSession.create({
      data: {
        student_id: options.user.id!,
        problem_id: options.problemId,
        previous_state: { extensionData: {}, code: state } as PracticeSessionData,
        done: false
      }
    });

    return new ServerPracticeSession(practiceSession, problem, options.user);
  }

  /**
   * Find practice sessions by user and/or problem.
   */
  public async findBy(options: FindByOptions): Promise<ServerPracticeSession[]> {
    const where: Record<string, unknown> = {
      student_id: options.user.id
    };

    if (options.problemId) {
      where.problem_id = options.problemId;
    }

    const sessions = await db.practiceSession.findMany({
      where,
      include: { problem: true }
    });

    return sessions.map(
      (s) =>
        new ServerPracticeSession(
          s,
          new Problem(s.problem as unknown as ProblemModel),
          options.user
        )
    );
  }

  /**
   * Find a single practice session by ID, including the related problem.
   */
  public async findById(options: FindByIdOptions): Promise<ServerPracticeSession | null> {
    const practiceSession = await db.practiceSession.findUnique({
      where: {
        id: options.id
      },
      include: { problem: true }
    });

    if (!practiceSession) return null;

    return new ServerPracticeSession(
      practiceSession,
      new Problem(practiceSession.problem as unknown as ProblemModel),
      options.user
    );
  }

  /**
   * Get the latest non-done practice session for a user and problem.
   * If no such session exists, create a new one.
   */
  public async findLatestNonDoneOrCreate(
    options: FindLatestNonDoneOptions
  ): Promise<ServerPracticeSession | null> {
    const practiceSession = await db.practiceSession.findFirst({
      where: {
        student_id: options.user.id,
        problem_id: options.problemId,
        done: false
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (practiceSession) {
      const problem = await ProblemService.instance().findById({
        id: practiceSession.problem_id,
        user: options.user
      });

      if (!problem) {
        throw new Error(
          `Problem ${practiceSession.problem_id} not found for session ${practiceSession.id}`
        );
      }

      return new ServerPracticeSession(practiceSession, problem, options.user);
    }

    const problem = await ProblemService.instance().findById({
      id: options.problemId,
      user: options.user
    });

    if (!problem) {
      throw new Error(`Problem ${options.problemId} not found`);
    }

    const newSession = await this.create({
      ...options
    });

    return newSession;
  }

  /**
   * Delete a practice session, verifying ownership.
   */
  public async delete(options: { id: string; user: User }): Promise<boolean> {
    try {
      await db.practiceSession.delete({
        where: { id: options.id, student_id: options.user.id }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark a practice session as done, verifying ownership.
   */
  public async markAsDone(options: {
    id: string;
    user: User;
  }): Promise<ServerPracticeSession | null> {
    return this.update({
      ...options,
      newState: { done: true }
    });
  }

  /**
   * Update a practice session, verifying ownership.
   */
  public async update(options: {
    id: string;
    user: User;
    newState: Partial<PracticeSessionModel>;
  }): Promise<ServerPracticeSession | null> {
    const updated = await db.practiceSession.update({
      where: { id: options.id, student_id: options.user.id || '' },
      data: { ...options.newState, previous_state: options.newState.previous_state || undefined }
    });

    const problem = await ProblemService.instance().findById({
      id: updated.problem_id,
      user: options.user
    });

    if (!problem) return null;

    return new ServerPracticeSession(updated, problem, options.user);
  }
}

export class ServerPracticeSession extends PracticeSession {
  public async persistPracticeSession(): Promise<void> {
    const service = ServerServiceProvider.instance().getService(PracticeSessionService);

    await service.update({
      id: this.id,
      newState: this.model,
      user: this.currentUser
    });
  }
}
