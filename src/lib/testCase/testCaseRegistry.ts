import { ServiceRegistry } from '$lib/registry';
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
    // eslint-disable-next-line no-unused-vars
    from?(model: TestCaseModel, problem: Problem): Promise<TestCase>;
  }
> {
  constructor() {
    super();
    this.register(FunctionTestCase.id(), FunctionTestCase);
    this.register(StdioTestCase.id(), StdioTestCase);
    this.register(CustomTestCase.id(), CustomTestCase);
  }

  public async from(model: TestCaseModel, problem: Problem): Promise<TestCase> {
    const cls = await this.getStatic(model.type);
    return cls.from ? cls.from(model, problem) : this.getInstance(model.type, model, problem);
  }
}
