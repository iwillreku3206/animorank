import { ServiceRegistry } from '$lib/services/registry';
import type { ProblemTestCase } from '$lib/zenstack/models';
import { TestCase, type CreateOptions } from './testCase';
import { FunctionOutputTestCase } from './testCase/functionOutputTestCase';

export class TestCaseRegistry extends ServiceRegistry<
  TestCase<any>,
  [ProblemTestCase],
  {
    create(options: CreateOptions): Promise<ProblemTestCase>;
  }
> {
  public constructor() {
    super();
    this.register('FunctionOutputTestCase', FunctionOutputTestCase);
  }
}
