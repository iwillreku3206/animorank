import { ServiceRegistry } from '$lib/services/registry';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import type { TestCase } from './testCase.svelte';
import type { Problem } from '$lib/problem';
import { FunctionTestCase } from './builtin/functionTestCase/functionTestCase.svelte';

export class testCaseRegistry extends ServiceRegistry<
  TestCase,
  [TestCaseModel, Problem],
  {
    id(): string;
    // eslint-disable-next-line no-unused-vars
    create(problem: Problem): Promise<TestCase>;
  }
> {
  constructor() {
    super();
    this.register('function', FunctionTestCase);
  }
}
