import { db } from '$lib/zenstack';
import type { ProblemTestCase, ProblemTestCaseType } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';
import { TestCaseRegistry } from './testCaseRegistry';
import type { TestCase } from './testCase';

export interface FindByProblemOptions {
  problemId: string;
  user: User;
}

export interface FindByIdOptions {
  id: string;
  user: User;
}

export interface CreateOptions {
  type: ProblemTestCaseType;
  problemId: string;
  user: User;
}

export class TestCaseService {
  private static _instance: TestCaseService | null;
  private testCaseRegistry: TestCaseRegistry;

  private constructor() {
    this.testCaseRegistry = new TestCaseRegistry();
  }

  public static instance(): TestCaseService {
    if (!TestCaseService._instance) {
      TestCaseService._instance = new TestCaseService();
    }
    return TestCaseService._instance;
  }

  public async create(options: CreateOptions): Promise<ProblemTestCase | null> {
    const problem = await db.problem.findUnique({
      where: {
        id: options.problemId,
        problem_set: { collaborators: { some: { collaborator_id: options.user.id || '' } } }
      }
    });

    if (!problem) return null;

    return this.testCaseRegistry.getStatic(options.type).create(options);
  }

  public async findByProblem(options: FindByProblemOptions): Promise<TestCase<ProblemTestCase>[]> {
    const { testCaseRegistry } = this;

    const testCases = await db.problemTestCase.findMany({
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
      }
    });

    return testCases.map((testCase) => {
      return testCaseRegistry.getInstance(testCase.type, testCase);
    });
  }

  public async findById(options: FindByIdOptions): Promise<TestCase<ProblemTestCase> | null> {
    const { testCaseRegistry } = this;

    const testCase = await db.problemTestCase.findUnique({
      where: {
        id: options.id,
        problem: {
          problem_set: { collaborators: { some: { collaborator_id: options.user.id || '' } } }
        }
      }
    });

    if (!testCase) return null;

    return testCaseRegistry.getInstance(testCase.type, testCase);
  }

  public async delete(id: string) {
    return db.problemTestCase.delete({ where: { id } });
  }
}
