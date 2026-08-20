import { ServiceRegistry } from '$lib/services/registry';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { TestCase } from './testCase.svelte';
import type { Problem } from '$lib/problem';
import { FunctionTestCase } from './builtin/functionTestCase/functionTestCase.svelte';
import { StdioTestCase } from './builtin/stdioTestCase/stdioTestCase.svelte';
import { CustomTestCase } from './builtin/customTestCase/customTestCase.svelte';

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
    this.register('stdio', StdioTestCase);
    this.register('custom', CustomTestCase);
  }

  public from(model: TestCaseModel, problem: Problem) {
    return this.getInstance(model.type, model, problem);
  }
}
