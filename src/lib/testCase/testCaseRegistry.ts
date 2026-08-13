import { ServiceRegistry } from '$lib/services/registry';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { TestCase } from './testCase.svelte';
import type { Problem } from '$lib/problem';
import { FunctionTestCase } from './builtin/functionTestCase/functionTestCase.svelte';

export class TestCaseRegistry extends ServiceRegistry<
  TestCase,
  [TestCaseModel, Problem],
  {
    id(): string;
    // eslint-disable-next-line no-unused-vars
    create(problem: Problem): Promise<TestCase>;
  }
> {
  private static _instance: TestCaseRegistry | null;

  public static instance(): TestCaseRegistry {
    if (!TestCaseRegistry._instance) {
      TestCaseRegistry._instance = new TestCaseRegistry();
    }
    return TestCaseRegistry._instance;
  }

  constructor() {
    super();
    this.register('function', FunctionTestCase);
  }

  public from(model: TestCaseModel, problem: Problem) {
    return this.getInstance(model.type, model, problem);
  }
}
