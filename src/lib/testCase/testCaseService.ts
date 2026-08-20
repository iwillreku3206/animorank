import { db } from '$lib/zenstack';
import type { User } from '@auth/sveltekit';
import type { JsonValue } from '@zenstackhq/orm';
import { Problem } from '$lib/problem';
import { TestCaseRegistry } from './testCaseRegistry';
import { ServerTestCaseRegistry } from './testCaseRegistry.server';
import type { ServerTestCase } from './testCase.server';

export interface FindByProblemOptions {
  problemId: string;
  user: User;
}

export interface FindByIdOptions {
  id: string;
  user: User;
}

export interface CreateOptions {
  problemId: string;
  type: string;
  user: User;
}

export interface UpdateOptions {
  id: string;
  type?: string;
  public?: boolean;
  data?: JsonValue;
  user: User;
}

export class TestCaseService {
  private static _instance: TestCaseService | null;

  private constructor() {}

  public static instance(): TestCaseService {
    if (!TestCaseService._instance) {
      TestCaseService._instance = new TestCaseService();
    }
    return TestCaseService._instance;
  }

  /** Access check shared across all methods that target a specific test case. */
  private async authorizeTestCase(id: string, user: User) {
    return db.problemTestCase.findUnique({
      where: {
        id,
        problem: {
          problem_set: { collaborators: { some: { collaborator_id: user.id || '' } } }
        }
      }
    });
  }

  public async create(options: CreateOptions): Promise<ServerTestCase | null> {
    const problem = await db.problem.findUnique({
      where: {
        id: options.problemId,
        problem_set: { collaborators: { some: { collaborator_id: options.user.id || '' } } }
      }
    });

    if (!problem) return null;

    const defaultData: Record<string, JsonValue> = {
      function: { function: '', parameters: [], comparisons: [] },
      stdio: { input: '', output: '' },
      custom: { test_code: '' }
    };

    const model = await db.problemTestCase.create({
      data: {
        type: options.type,
        problem_id: options.problemId,
        data: defaultData[options.type] ?? {}
      }
    });

    return ServerTestCaseRegistry.instance().from(model, new Problem(problem));
  }

  public async findByProblem(options: FindByProblemOptions): Promise<ServerTestCase[]> {
    const problem = await db.problem.findUnique({
      where: { id: options.problemId }
    });

    if (!problem) return [];

    const models = await db.problemTestCase.findMany({
      where: {
        problem_id: options.problemId,
        problem: {
          problem_set: {
            OR: [
              { collaborators: { some: { collaborator_id: options.user.id || '' } } },
              { is_global: true },
              { subscriptions: { some: { student_id: options.user.id || '' } } }
            ]
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    return models.map((model) => ServerTestCaseRegistry.instance().from(model, new Problem(problem)));
  }

  public async findById(options: FindByIdOptions): Promise<ServerTestCase | null> {
    const model = await this.authorizeTestCase(options.id, options.user);
    if (!model) return null;

    const problem = await db.problem.findUnique({ where: { id: model.problem_id } });
    if (!problem) return null;

    return ServerTestCaseRegistry.instance().from(model, new Problem(problem));
  }

  public async update(options: UpdateOptions): Promise<ServerTestCase | null> {
    const existing = await this.authorizeTestCase(options.id, options.user);
    if (!existing) return null;

    const model = await db.problemTestCase.update({
      where: { id: options.id },
      data: {
        ...(options.type !== undefined && { type: options.type }),
        ...(options.public !== undefined && { public: options.public }),
        ...(options.data !== undefined && { data: options.data })
      }
    });

    const problem = await db.problem.findUnique({ where: { id: model.problem_id } });
    if (!problem) return null;

    return ServerTestCaseRegistry.instance().from(model, new Problem(problem));
  }

  public async delete(id: string, user: User): Promise<boolean> {
    const existing = await this.authorizeTestCase(id, user);
    if (!existing) return false;

    await db.problemTestCase.delete({ where: { id } });
    return true;
  }
}
