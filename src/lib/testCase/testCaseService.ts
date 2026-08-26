import { db } from '$lib/zenstack';
import type { User } from '@auth/sveltekit';
import type { JsonValue } from '@zenstackhq/orm';
import type { ProblemTestCase } from '$lib/zenstack/models';
import { Problem } from '$lib/problem';
import { ServerRegistryProvider } from '$lib/registry/server';
import { ServerTestCaseRegistry } from './testCaseRegistry.server';
import type { ServerTestCase } from './testCase.server';
import { validateFunctionTestCaseKeys } from './builtin/functionTestCase/types.server';

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

    // Reject arbitrary type strings (M4): an unregistered type would create a
    // row no registry key can hydrate — invisible in the editor, undeletable
    // from the UI, and a permanent failure in runs. Registered types create
    // their own default data instead of a duplicated hardcoded map.
    const registry = ServerRegistryProvider.instance().getRegistry(ServerTestCaseRegistry);
    if (!registry.keys().includes(options.type)) {
      throw new Error(`Unknown test case type "${options.type}"`);
    }

    return registry.getStatic(options.type).create(new Problem(problem));
  }

  /**
   * Fetch the problem and its (access-filtered) test case models for a
   * problem. Returns null when the problem does not exist.
   */
  private async fetchByProblem(
    options: FindByProblemOptions
  ): Promise<{ problem: Problem; models: ProblemTestCase[] } | null> {
    const problemModel = await db.problem.findUnique({
      where: { id: options.problemId }
    });

    if (!problemModel) return null;

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

    return { problem: new Problem(problemModel), models };
  }

  public async findByProblem(options: FindByProblemOptions): Promise<ServerTestCase[]> {
    const fetched = await this.fetchByProblem(options);
    if (!fetched) return [];

    return fetched.models.map((model) =>
      ServerRegistryProvider.instance().getRegistry(ServerTestCaseRegistry).from(model, fetched.problem)
    );
  }

  /**
   * Like findByProblem, but for the edit page: every function test case's
   * keys are validated against the problem's function definitions before
   * construction. Invalid rows are skipped and logged instead of throwing —
   * a single stale row used to 500 the whole page load (and the suggested
   * repair, "delete the test case or restore the function", was unreachable
   * because the page never rendered). The Functions window now blocks
   * creating such rows in the first place.
   */
  public async findByProblemForEdit(options: FindByProblemOptions): Promise<ServerTestCase[]> {
    const fetched = await this.fetchByProblem(options);
    if (!fetched) return [];

    const result: ServerTestCase[] = [];
    for (const model of fetched.models) {
      const invalid = validateFunctionTestCaseKeys(model, fetched.problem);
      if (invalid) {
        console.error(`Skipping unhydratable test case ${model.id}: ${invalid}`);
        continue;
      }
      result.push(ServerRegistryProvider.instance().getRegistry(ServerTestCaseRegistry).from(model, fetched.problem));
    }
    return result;
  }

  public async findById(options: FindByIdOptions): Promise<ServerTestCase | null> {
    const model = await this.authorizeTestCase(options.id, options.user);
    if (!model) return null;

    const problem = await db.problem.findUnique({ where: { id: model.problem_id } });
    if (!problem) return null;

    return ServerRegistryProvider.instance().getRegistry(ServerTestCaseRegistry).from(model, new Problem(problem));
  }

  public async update(options: UpdateOptions): Promise<ServerTestCase | null> {
    const existing = await this.authorizeTestCase(options.id, options.user);
    if (!existing) return null;

    // Reject payloads that would produce an unparseable row (M9): unknown
    // type keys, non-boolean public, or data that does not match the
    // effective type's schema.
    ServerRegistryProvider.instance()
      .getRegistry(ServerTestCaseRegistry)
      .validateUpdate({ type: options.type, public: options.public, data: options.data }, existing.type);

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

    return ServerRegistryProvider.instance().getRegistry(ServerTestCaseRegistry).from(model, new Problem(problem));
  }

  public async delete(id: string, user: User): Promise<boolean> {
    const existing = await this.authorizeTestCase(id, user);
    if (!existing) return false;

    await db.problemTestCase.delete({ where: { id } });
    return true;
  }
}
