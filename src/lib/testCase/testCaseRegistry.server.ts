import type { Problem } from '$lib/problem';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import { ServerFunctionTestCase } from './builtin/functionTestCase/functionTestCase.server';
import type { ServerTestCase } from './testCase.server';
import type { ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';

export class ServerTestCaseRegistry extends ServiceRegistry<
  ServerTestCase,
  [TestCaseModel, Problem],
  {
    id(): string;
    // eslint-disable-next-line no-unused-vars
    create(problem: Problem): Promise<ServerTestCase>;
  }
> {
  constructor() {
    super();
    this.registerTest(ServerFunctionTestCase);
  }

  public registerTest(value: ClassServiceOf<this>): void {
    super.register(value.id(), value);
  }
}
