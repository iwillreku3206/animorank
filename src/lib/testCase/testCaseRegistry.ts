import { ServiceRegistry } from '$lib/services/registry';
import type { ProblemTestCase } from '$lib/zenstack/models';
import { TestCase, type CreateOptions } from './testCase';
import { FunctionOutputTestCase } from './testCase/functionOutputTestCase';
import { CustomTestCase } from './testCase/customTestCase';
import { ProgramIOTestCase } from './testCase/programIOTestCase';

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
    this.register('ProgramIOTestCase', ProgramIOTestCase);
    this.register('CustomTestCase', CustomTestCase);
  }
}
