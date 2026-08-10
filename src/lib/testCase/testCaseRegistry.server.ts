import type { Problem } from '$lib/problem';
import { ServiceRegistry, type ClassServiceOf } from '$lib/services/registry';
import type { ServerTestCase } from './testCase.server';
import type { TestCase } from './testCase.svelte';

export class ServerTestCaseRegistry extends ServiceRegistry<
  ServerTestCase,
  [TestCase],
  {
    id(): string;
    // eslint-disable-next-line no-unused-vars
    create(problem: Problem): Promise<ServerTestCase>;
  }
> {
  constructor() {
    super();
  }

  public registerTest(value: ClassServiceOf<this>): void {
    super.register(value.id(), value);
  }
}
